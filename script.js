/**
 * Time Calculator & Cumulative Tracker
 * Pure client-side application in English
 * - Centered workspace layout with saved time list on the right
 * - No item names/labels: pure time interval tracking
 * - 24H (European, no AM/PM) / 12H (AM/PM) toggle switch with matching inputs
 * - Custom digit inputs for time picking (no browser shadow-DOM AM/PM interference)
 * - Real-time calculation of daily hours and date differences
 * - Cumulative sum, average, export, and LocalStorage persistence
 */

(() => {
    'use strict';

    // =========================================================================
    // Storage & State
    // =========================================================================
    const STORAGE_KEY = 'time_calculator_intervals_v2';
    const FORMAT_KEY = 'time_calculator_format';
    const DRAFT_KEY = 'time_calculator_active_draft_v1';

    let isInitializing = true;

    const state = {
        currentMode: 'hours', // 'hours' | 'dates'
        timeFormat: localStorage.getItem(FORMAT_KEY) || '24h', // default 24h for European preference
        intervals: [],
        editingId: null,
        userOvernightForced: false,
        isLive: false,
    };

    // =========================================================================
    // DOM Elements
    // =========================================================================
    const elements = {
        // Clock & Quick Stats
        statusBadge: document.getElementById('status-badge'),
        currentClock: document.getElementById('current-clock'),
        statCount: document.getElementById('stat-count'),
        statTotalQuick: document.getElementById('stat-total-quick'),
        statAvgQuick: document.getElementById('stat-avg-quick'),

        // Mode Switcher Tabs
        tabHours: document.getElementById('tab-hours'),
        tabDates: document.getElementById('tab-dates'),
        modeHoursView: document.getElementById('mode-hours-view'),
        modeDatesView: document.getElementById('mode-dates-view'),

        // Mode 1: Hours (Custom Inputs)
        timeStartH: document.getElementById('time-start-h'),
        timeStartM: document.getElementById('time-start-m'),
        timeStartPeriod: document.getElementById('time-start-period'),

        timeEndH: document.getElementById('time-end-h'),
        timeEndM: document.getElementById('time-end-m'),
        timeEndPeriod: document.getElementById('time-end-period'),

        checkNextDay: document.getElementById('check-next-day'),
        midnightIndicator: document.getElementById('midnight-indicator'),
        btnStartNow: document.getElementById('btn-start-now'),
        btnEndNow: document.getElementById('btn-end-now'),
        btnAddHoursEntry: document.getElementById('btn-add-hours-entry'),
        btnCancelHoursEdit: document.getElementById('btn-cancel-hours-edit'),

        // Mode 1 Live Results
        btnLiveHours: document.getElementById('btn-live-hours'),
        hoursResPrimary: document.getElementById('hours-res-primary'),
        hoursResDays: document.getElementById('hours-res-days'),
        hoursResHours: document.getElementById('hours-res-hours'),
        hoursResMins: document.getElementById('hours-res-mins'),
        hoursResSecs: document.getElementById('hours-res-secs'),

        // Mode 2: Dates (Date + Custom Time Inputs)
        datesStartD: document.getElementById('dates-start-d'),
        datesStartH: document.getElementById('dates-start-h'),
        datesStartM: document.getElementById('dates-start-m'),
        datesStartPeriod: document.getElementById('dates-start-period'),
        btnDateStartNow: document.getElementById('btn-date-start-now'),

        datesEndD: document.getElementById('dates-end-d'),
        datesEndH: document.getElementById('dates-end-h'),
        datesEndM: document.getElementById('dates-end-m'),
        datesEndPeriod: document.getElementById('dates-end-period'),
        btnDateEndNow: document.getElementById('btn-date-end-now'),
        btnAddDatesEntry: document.getElementById('btn-add-dates-entry'),
        btnCancelDatesEdit: document.getElementById('btn-cancel-dates-edit'),

        // Mode 2 Live Results
        btnLiveDates: document.getElementById('btn-live-dates'),
        datesResPrimary: document.getElementById('dates-res-primary'),
        datesResDays: document.getElementById('dates-res-days'),
        datesResHours: document.getElementById('dates-res-hours'),
        datesResMins: document.getElementById('dates-res-mins'),
        datesResSecs: document.getElementById('dates-res-secs'),
        datesResWorkdays: document.getElementById('dates-res-workdays'),
        datesResWeekends: document.getElementById('dates-res-weekends'),

        // List Containers
        entriesEmpty: document.getElementById('entries-empty'),
        entriesListWrap: document.getElementById('entries-list-wrap'),

        // Global Nav Actions
        btnFormat24h: document.getElementById('btn-format-24h'),
        btnFormat12h: document.getElementById('btn-format-12h'),
        btnClearAll: document.getElementById('btn-clear-all'),
        btnExportDropdown: document.getElementById('btn-export-dropdown'),
        exportMenu: document.getElementById('export-menu'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        exportJsonBtn: document.getElementById('export-json-btn'),
        importJsonBtn: document.getElementById('import-json-btn'),
        fileImport: document.getElementById('file-import'),
        btnCopySummary: document.getElementById('btn-copy-summary'),

        // Toast Container
        toastContainer: document.getElementById('toast-container'),
    };

    // =========================================================================
    // Time & Date Utilities
    // =========================================================================

    /**
     * Get 24-hour format string "HH:MM" from custom time picker elements
     */
    function getTimePickerValue(hEl, mEl, pEl) {
        let hours = parseInt(hEl.value, 10) || 0;
        const mins = Math.min(59, Math.max(0, parseInt(mEl.value, 10) || 0));

        if (state.timeFormat === '12h') {
            const period = (pEl.textContent || 'AM').trim();
            if (period === 'PM' && hours < 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }
        }

        hours = Math.min(23, Math.max(0, hours));
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(mins)}`;
    }

    /**
     * Set time picker elements from 24-hour string "HH:MM" respecting active format
     */
    function setTimePickerValue(hEl, mEl, pEl, time24Str) {
        if (!time24Str) time24Str = '00:00';
        const [hStr, mStr] = time24Str.split(':');
        let hours = parseInt(hStr, 10) || 0;
        const mins = Math.min(59, Math.max(0, parseInt(mStr, 10) || 0));
        const pad = (n) => String(n).padStart(2, '0');

        if (state.timeFormat === '24h') {
            hEl.value = pad(hours);
            mEl.value = pad(mins);
            pEl.classList.add('hidden');
        } else {
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            if (hours === 0) hours = 12;
            hEl.value = pad(hours);
            mEl.value = pad(mins);
            pEl.textContent = period;
            pEl.classList.remove('hidden');
        }
    }

    function getStartTime24() {
        return getTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod);
    }

    function getEndTime24() {
        return getTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod);
    }

    /**
     * Format ISO datetime string (YYYY-MM-DDTHH:MM) according to active 24H or 12H preference
     */
    function formatDateDisplay(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: state.timeFormat === '12h'
        });
    }

    /**
     * Format time string (HH:MM) according to active 24H or 12H preference for display
     */
    function formatTimeDisplay(timeStr) {
        if (!timeStr) return '';
        if (timeStr.includes('T')) {
            return formatDateDisplay(timeStr);
        }
        if (state.timeFormat === '24h') {
            return timeStr;
        }

        const [hStr, mStr] = timeStr.split(':');
        let hours = parseInt(hStr, 10) || 0;
        const minutes = (mStr || '00').padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        if (hours === 0) hours = 12;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(hours)}:${minutes} ${period}`;
    }

    /**
     * Format duration in seconds into "Xh Ym", "Ym", or "Xs"
     * If includeDays is true, formats into "Xd Yh Zm" (e.g. for Dates mode)
     * If showLiveSeconds is true, includes ticking seconds for real-time timer display
     */
    function formatDuration(seconds, includeDays = false, showLiveSeconds = false) {
        if (!seconds || seconds <= 0) return includeDays ? '0d\u00A00h\u00A00m' : '0m';
        const totalMins = Math.floor(seconds / 60);
        const mins = totalMins % 60;
        const totalHours = Math.floor(totalMins / 60);
        const secs = seconds % 60;

        if (includeDays) {
            const days = Math.floor(totalHours / 24);
            const hours = totalHours % 24;
            if (showLiveSeconds) {
                return `${days}d\u00A0${hours}h\u00A0${mins}m\u00A0${secs}s`;
            }
            return `${days}d\u00A0${hours}h\u00A0${mins}m`;
        }

        const hours = totalHours;
        const parts = [];

        if (showLiveSeconds) {
            if (hours > 0) parts.push(`${hours}h`);
            if (mins > 0 || hours > 0) parts.push(`${mins}m`);
            parts.push(`${secs}s`);
            return parts.join('\u00A0') || '0s';
        }

        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0 || (hours === 0 && secs === 0)) parts.push(`${mins}m`);
        if (secs > 0 && hours === 0 && mins < 5) parts.push(`${secs}s`);

        return parts.join('\u00A0') || '0m';
    }

    /**
     * Parse "HH:MM" string to total minutes from start of day
     */
    function parseTimeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    }

    /**
     * Format current date/time to local ISO string for <input type="datetime-local">
     */
    function toLocalISOString(date) {
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const mins = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${mins}`;
    }

    /**
     * Format Date to local "YYYY-MM-DD"
     */
    function toLocalDateString(date) {
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        return `${year}-${month}-${day}`;
    }

    function getDatesStartDateTime() {
        if (!elements.datesStartD || !elements.datesStartD.value) return null;
        const timeStr = getTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod);
        return `${elements.datesStartD.value}T${timeStr}`;
    }

    function getDatesEndDateTime() {
        if (!elements.datesEndD || !elements.datesEndD.value) return null;
        const timeStr = getTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod);
        return `${elements.datesEndD.value}T${timeStr}`;
    }

    function setDatesStartDateTime(date) {
        const pad = (n) => String(n).padStart(2, '0');
        elements.datesStartD.value = toLocalDateString(date);
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        setTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod, `${hh}:${mm}`);
    }

    function setDatesEndDateTime(date) {
        const pad = (n) => String(n).padStart(2, '0');
        elements.datesEndD.value = toLocalDateString(date);
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        setTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod, `${hh}:${mm}`);
    }

    /**
     * Format current 2-digit local time "HH:MM"
     */
    function getCurrentTimeString() {
        const d = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    /**
     * Calculate difference between two hours of the day
     */
    function calculateHoursDiff(startStr, endStr, forceNextDay = false, currentSeconds = 0) {
        const startMins = parseTimeToMinutes(startStr);
        let endMins = parseTimeToMinutes(endStr);

        let isNextDay = forceNextDay;
        if (!forceNextDay && endMins < startMins) {
            isNextDay = true;
        }

        if (isNextDay) {
            endMins += 24 * 60;
        }

        const diffMins = Math.max(0, endMins - startMins);
        const totalSeconds = diffMins * 60 + (currentSeconds || 0);

        return {
            diffMins,
            totalSeconds,
            decimalHours: (totalSeconds / 3600).toFixed(2),
            isNextDay,
        };
    }

    /**
     * Calculate difference between two dates
     */
    function calculateDatesDiff(startDateStr, endDateStr, currentSeconds = 0) {
        if (!startDateStr || !endDateStr) {
            return {
                totalSeconds: 0,
                totalDays: 0,
                totalHours: 0,
                workdaySeconds: 0,
                weekendSeconds: 0,
                workdays: '0d',
                weekends: '0d',
                invalid: false,
            };
        }

        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        if (currentSeconds > 0) {
            end.setSeconds(currentSeconds);
        }
        const diffMs = end.getTime() - start.getTime();

        if (isNaN(diffMs) || diffMs < 0) {
            return {
                totalSeconds: 0,
                totalDays: 0,
                totalHours: 0,
                workdaySeconds: 0,
                weekendSeconds: 0,
                workdays: '0d',
                weekends: '0d',
                invalid: true,
            };
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const totalHours = Math.floor(totalSeconds / 3600);
        const totalDays = Math.floor(totalHours / 24);

        // O(1) analytical calculation of full weeks (7 days = 5 workdays + 2 weekend days)
        const fullWeeks = Math.floor(totalSeconds / (7 * 86400));
        const fullWeekWeekendSeconds = fullWeeks * 2 * 86400;

        let weekendRemainderSeconds = 0;
        let cur = new Date(start.getTime() + fullWeeks * 7 * 86400 * 1000);

        // At most 7 slice iterations for remainder period to avoid freezing on large year gaps
        while (cur < end) {
            const nextMidnight = new Date(cur);
            nextMidnight.setHours(24, 0, 0, 0);

            const sliceEnd = nextMidnight < end ? nextMidnight : end;
            const sliceSeconds = Math.max(0, Math.floor((sliceEnd.getTime() - cur.getTime()) / 1000));

            const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendRemainderSeconds += sliceSeconds;
            }

            cur = sliceEnd;
        }

        const totalWeekendSeconds = fullWeekWeekendSeconds + weekendRemainderSeconds;
        const totalWorkdaySeconds = Math.max(0, totalSeconds - totalWeekendSeconds);

        const formatDays = (seconds) => {
            if (!seconds || seconds <= 0) return '0d';
            const d = seconds / 86400;
            if (d >= 1 && d % 1 === 0) return `${d}d`;
            if (d < 0.01) return '<0.01d';
            return `${d.toFixed(2)}d`;
        };

        return {
            totalSeconds,
            totalDays,
            totalHours,
            workdaySeconds: totalWorkdaySeconds,
            weekendSeconds: totalWeekendSeconds,
            workdays: formatDays(totalWorkdaySeconds),
            weekends: formatDays(totalWeekendSeconds),
            invalid: false,
        };
    }

    // =========================================================================
    // UI Toast Notifications
    // =========================================================================
    const MAX_TOASTS = 3;

    function showToast(message, type = 'info') {
        if (!elements.toastContainer) return;

        // Limit toasts to 3 max: remove oldest toasts before adding a new one
        while (elements.toastContainer.children.length >= MAX_TOASTS) {
            elements.toastContainer.firstElementChild.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            iconSvg = `<svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="8"></line></svg>`;
        }

        toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
        toast.style.cursor = 'pointer';
        toast.title = 'Click to dismiss';
        toast.addEventListener('click', () => toast.remove());

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                setTimeout(() => toast.remove(), 250);
            }
        }, 2400);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // =========================================================================
    // =========================================================================
    // Live Timer Mode Controller & Clock
    // =========================================================================
    function updateLiveModeUI() {
        const isLive = Boolean(state.isLive);
        [elements.btnLiveHours, elements.btnLiveDates].forEach((btn) => {
            if (!btn) return;
            if (isLive) {
                btn.classList.add('is-active');
                btn.setAttribute('aria-pressed', 'true');
                btn.title = 'Live timer mode active (End Time auto-updating). Click to stop';
            } else {
                btn.classList.remove('is-active');
                btn.setAttribute('aria-pressed', 'false');
                btn.title = 'Click to activate Live Timer (auto-updates End Time)';
            }
        });

        if (elements.statusBadge) {
            if (isLive) {
                elements.statusBadge.className = 'badge badge-live-on';
                elements.statusBadge.title = 'Live mode is ON — End time is auto-counting (Click to toggle)';
            } else {
                elements.statusBadge.className = 'badge badge-live-off';
                elements.statusBadge.title = 'Live mode is OFF — Click LIVE button to start (Click to toggle)';
            }
        }
    }

    function syncEndTimeToCurrent(currentSeconds = 0) {
        const now = new Date();
        const secs = currentSeconds !== undefined ? currentSeconds : now.getSeconds();
        if (state.currentMode === 'hours') {
            setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, getCurrentTimeString());
            updateHoursCalculation(secs);
        } else {
            setDatesEndDateTime(now);
            updateDatesCalculation(secs);
        }
    }

    function setLiveMode(active, showFeedback = true) {
        const wasLive = Boolean(state.isLive);
        state.isLive = Boolean(active);
        updateLiveModeUI();

        if (state.isLive) {
            syncEndTimeToCurrent(new Date().getSeconds());
            if (showFeedback && !wasLive) {
                showToast('Live timer started: End time is continuously updating', 'info');
            }
        } else {
            if (state.currentMode === 'hours') {
                updateHoursCalculation(0);
            } else {
                updateDatesCalculation(0);
            }
            if (showFeedback && wasLive) {
                showToast('Live timer stopped', 'info');
            }
        }
        saveDraftState();
    }

    function toggleLiveMode() {
        setLiveMode(!state.isLive, true);
    }

    function initLiveClock() {
        const updateClock = () => {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');

            if (state.timeFormat === '24h') {
                elements.currentClock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
            } else {
                let hours = now.getHours();
                const period = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                if (hours === 0) hours = 12;
                elements.currentClock.textContent = `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${period}`;
            }

            // Real-time timer auto-update when Live mode is active
            if (state.isLive) {
                if (state.currentMode === 'hours') {
                    setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, getCurrentTimeString());
                    updateHoursCalculation(now.getSeconds());
                } else if (state.currentMode === 'dates') {
                    setDatesEndDateTime(now);
                    updateDatesCalculation(now.getSeconds());
                }
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    // =========================================================================
    // Custom Time Picker Digit Input Event Handler
    // =========================================================================
    function setupCustomTimePicker(hEl, mEl, pEl, onUpdate, onManualEdit) {
        const pad = (n) => String(n).padStart(2, '0');
        const notifyManual = () => {
            if (typeof onManualEdit === 'function') {
                onManualEdit();
            }
        };

        // Focus selection
        hEl.addEventListener('focus', () => hEl.select());
        mEl.addEventListener('focus', () => mEl.select());

        // Hours typing
        hEl.addEventListener('input', () => {
            notifyManual();
            let val = hEl.value.replace(/\D/g, '');
            if (val.length === 0) {
                onUpdate();
                return;
            }

            const num = parseInt(val, 10);
            if (val.length >= 2) {
                let clamped;
                if (state.timeFormat === '24h') {
                    clamped = Math.min(23, Math.max(0, num));
                } else {
                    clamped = Math.min(12, Math.max(1, num));
                }
                hEl.value = pad(clamped);
                mEl.focus();
                mEl.select();
            } else {
                hEl.value = val;
            }
            onUpdate();
        });

        // Minutes typing
        mEl.addEventListener('input', () => {
            notifyManual();
            let val = mEl.value.replace(/\D/g, '');
            if (val.length === 0) {
                onUpdate();
                return;
            }

            const num = parseInt(val, 10);
            if (val.length >= 2) {
                const clamped = Math.min(59, Math.max(0, num));
                mEl.value = pad(clamped);
            } else {
                mEl.value = val;
            }
            onUpdate();
        });

        // Blur formatting
        hEl.addEventListener('blur', () => {
            let val = parseInt(hEl.value, 10);
            if (isNaN(val)) val = 0;
            if (state.timeFormat === '12h') {
                if (val < 1) val = 12;
                if (val > 12) val = 12;
            } else {
                if (val < 0) val = 0;
                if (val > 23) val = 23;
            }
            hEl.value = pad(val);
            onUpdate();
        });

        mEl.addEventListener('blur', () => {
            let val = parseInt(mEl.value, 10);
            if (isNaN(val) || val < 0) val = 0;
            if (val > 59) val = 59;
            mEl.value = pad(val);
            onUpdate();
        });

        // Keyboard navigation and increment
        hEl.addEventListener('keydown', (e) => {
            if (e.key === ':' || e.key === 'ArrowRight' || e.key === 'Enter') {
                e.preventDefault();
                mEl.focus();
                mEl.select();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                notifyManual();
                let val = (parseInt(hEl.value, 10) || 0) + 1;
                const max = state.timeFormat === '24h' ? 23 : 12;
                const min = state.timeFormat === '24h' ? 0 : 1;
                if (val > max) val = min;
                hEl.value = pad(val);
                onUpdate();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                notifyManual();
                let val = (parseInt(hEl.value, 10) || 0) - 1;
                const max = state.timeFormat === '24h' ? 23 : 12;
                const min = state.timeFormat === '24h' ? 0 : 1;
                if (val < min) val = max;
                hEl.value = pad(val);
                onUpdate();
            }
        });

        mEl.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || (e.key === 'Backspace' && mEl.value === '')) {
                e.preventDefault();
                hEl.focus();
                hEl.select();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                notifyManual();
                const step = e.shiftKey ? 5 : 1;
                let val = (parseInt(mEl.value, 10) || 0) + step;
                if (val > 59) val = 0;
                mEl.value = pad(val);
                onUpdate();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                notifyManual();
                const step = e.shiftKey ? 5 : 1;
                let val = (parseInt(mEl.value, 10) || 0) - step;
                if (val < 0) val = 59;
                mEl.value = pad(val);
                onUpdate();
            }
        });

        // Mouse wheel adjustment
        const handleWheel = (input, isHour, e) => {
            e.preventDefault();
            notifyManual();
            const delta = e.deltaY < 0 ? 1 : -1;
            let val = parseInt(input.value, 10) || 0;
            if (isHour) {
                const max = state.timeFormat === '24h' ? 23 : 12;
                const min = state.timeFormat === '24h' ? 0 : 1;
                val += delta;
                if (val > max) val = min;
                if (val < min) val = max;
            } else {
                val += delta;
                if (val > 59) val = 0;
                if (val < 0) val = 59;
            }
            input.value = pad(val);
            onUpdate();
        };

        hEl.addEventListener('wheel', (e) => handleWheel(hEl, true, e), { passive: false });
        mEl.addEventListener('wheel', (e) => handleWheel(mEl, false, e), { passive: false });

        // Period toggle (AM / PM)
        pEl.addEventListener('click', () => {
            notifyManual();
            pEl.textContent = pEl.textContent === 'AM' ? 'PM' : 'AM';
            onUpdate();
        });
    }

    // =========================================================================
    // Live Calculation Updates
    // =========================================================================
    function updateHoursCalculation(currentSeconds = 0) {
        const start = getStartTime24();
        const end = getEndTime24();
        const startMins = parseTimeToMinutes(start);
        const endMins = parseTimeToMinutes(end);

        const isAutoOvernight = endMins < startMins;

        if (isAutoOvernight) {
            elements.checkNextDay.checked = true;
            elements.checkNextDay.disabled = true;
            elements.checkNextDay.title = 'Automatically overnight (+1d) because end time is earlier than start time';
        } else {
            elements.checkNextDay.disabled = false;
            elements.checkNextDay.removeAttribute('title');
            elements.checkNextDay.checked = Boolean(state.userOvernightForced);
        }

        const forceNextDay = elements.checkNextDay.checked;
        const res = calculateHoursDiff(start, end, forceNextDay, state.isLive ? currentSeconds : 0);

        if (res.isNextDay) {
            elements.midnightIndicator.classList.remove('hidden');
        } else {
            elements.midnightIndicator.classList.add('hidden');
        }

        const daysDec = (res.totalSeconds / 86400).toFixed(2);
        const hoursDec = (res.totalSeconds / 3600).toFixed(2);
        const minsInt = Math.floor(res.totalSeconds / 60);
        const secsInt = res.totalSeconds;

        elements.hoursResPrimary.textContent = formatDuration(res.totalSeconds, false, state.isLive);
        elements.hoursResDays.textContent = `${daysDec} days`;
        elements.hoursResHours.textContent = `${hoursDec} hours`;
        elements.hoursResMins.textContent = `${minsInt.toLocaleString('en-US')} mins`;
        elements.hoursResSecs.textContent = `${secsInt.toLocaleString('en-US')} secs`;

        saveDraftState();
    }

    function updateDatesCalculation(currentSeconds = 0) {
        const start = getDatesStartDateTime();
        const end = getDatesEndDateTime();
        const res = calculateDatesDiff(start, end, state.isLive ? currentSeconds : 0);

        if (res.invalid) {
            elements.datesResPrimary.textContent = 'End date is before start date';
            elements.datesResDays.textContent = '0.00 days';
            elements.datesResHours.textContent = '0.00 hours';
            elements.datesResMins.textContent = '0 mins';
            elements.datesResSecs.textContent = '0 secs';
            elements.datesResWorkdays.textContent = '0d';
            elements.datesResWeekends.textContent = '0d';
            elements.datesResWorkdays.removeAttribute('title');
            elements.datesResWeekends.removeAttribute('title');
            saveDraftState();
            return;
        }

        const daysDec = (res.totalSeconds / 86400).toFixed(2);
        const hoursDec = (res.totalSeconds / 3600).toFixed(2);
        const minsInt = Math.floor(res.totalSeconds / 60);
        const secsInt = res.totalSeconds;

        elements.datesResPrimary.textContent = formatDuration(res.totalSeconds, true, state.isLive);
        elements.datesResDays.textContent = `${daysDec} days`;
        elements.datesResHours.textContent = `${hoursDec} hours`;
        elements.datesResMins.textContent = `${minsInt.toLocaleString('en-US')} mins`;
        elements.datesResSecs.textContent = `${secsInt.toLocaleString('en-US')} secs`;
        elements.datesResWorkdays.textContent = res.workdays;
        elements.datesResWeekends.textContent = res.weekends;
        elements.datesResWorkdays.title = formatDuration(res.workdaySeconds, true);
        elements.datesResWeekends.title = formatDuration(res.weekendSeconds, true);

        saveDraftState();
    }

    function adjustTime(target, deltaMins) {
        if (target === 'start') {
            let startMins = parseTimeToMinutes(getStartTime24());
            startMins += deltaMins;
            startMins = ((startMins % 1440) + 1440) % 1440;

            const pad = (n) => String(n).padStart(2, '0');
            const hh = pad(Math.floor(startMins / 60));
            const mm = pad(startMins % 60);
            setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, `${hh}:${mm}`);
            updateHoursCalculation();
        } else if (target === 'end') {
            if (state.isLive) setLiveMode(false, false);
            const startMins = parseTimeToMinutes(getStartTime24());
            let endMins = parseTimeToMinutes(getEndTime24());
            const isNextDay = elements.checkNextDay.checked || (endMins < startMins);

            let totalEndMins = endMins + (isNextDay ? 24 * 60 : 0);
            totalEndMins += deltaMins;

            if (totalEndMins < 0) {
                totalEndMins = ((totalEndMins % 1440) + 1440) % 1440;
                state.userOvernightForced = false;
                endMins = totalEndMins;
            } else if (totalEndMins >= 24 * 60) {
                endMins = totalEndMins % (24 * 60);
                state.userOvernightForced = (endMins >= startMins);
            } else {
                state.userOvernightForced = false;
                endMins = totalEndMins;
            }

            const pad = (n) => String(n).padStart(2, '0');
            const hh = pad(Math.floor(endMins / 60));
            const mm = pad(endMins % 60);
            setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, `${hh}:${mm}`);
            updateHoursCalculation();
        } else if (target === 'dates-start') {
            const curr = getDatesStartDateTime();
            if (curr) {
                const d = new Date(curr);
                d.setMinutes(d.getMinutes() + deltaMins);
                setDatesStartDateTime(d);
                updateDatesCalculation();
            }
        } else if (target === 'dates-end') {
            if (state.isLive) setLiveMode(false, false);
            const curr = getDatesEndDateTime();
            if (curr) {
                const d = new Date(curr);
                d.setMinutes(d.getMinutes() + deltaMins);
                setDatesEndDateTime(d);
                updateDatesCalculation();
            }
        }
    }

    // =========================================================================
    // Time Format Switcher (24H vs 12H)
    // =========================================================================
    function setTimeFormat(fmt) {
        // Read current 24-hour internal values before switching
        const start24 = getStartTime24();
        const end24 = getEndTime24();
        const datesStart24 = (elements.datesStartH && elements.datesStartM && elements.datesStartPeriod)
            ? getTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod)
            : null;
        const datesEnd24 = (elements.datesEndH && elements.datesEndM && elements.datesEndPeriod)
            ? getTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod)
            : null;

        state.timeFormat = fmt;
        localStorage.setItem(FORMAT_KEY, fmt);

        if (fmt === '24h') {
            elements.btnFormat24h.classList.add('active');
            elements.btnFormat12h.classList.remove('active');
        } else {
            elements.btnFormat12h.classList.add('active');
            elements.btnFormat24h.classList.remove('active');
        }

        // Re-render pickers with new format
        setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, start24);
        setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, end24);

        if (datesStart24 !== null && datesEnd24 !== null) {
            setTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod, datesStart24);
            setTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod, datesEnd24);
            updateDatesCalculation();
        }

        updateHoursCalculation();
        renderIntervals();
    }

    // =========================================================================
    // Active Input Draft Persistence
    // =========================================================================
    function saveDraftState() {
        if (isInitializing) return;
        try {
            const draft = {
                currentMode: state.currentMode,
                hours: {
                    start: getStartTime24(),
                    end: getEndTime24(),
                    userOvernightForced: Boolean(state.userOvernightForced),
                },
                dates: {
                    startDate: elements.datesStartD ? elements.datesStartD.value : '',
                    startTime: (elements.datesStartH && elements.datesStartM && elements.datesStartPeriod)
                        ? getTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod)
                        : '10:00',
                    endDate: elements.datesEndD ? elements.datesEndD.value : '',
                    endTime: (elements.datesEndH && elements.datesEndM && elements.datesEndPeriod)
                        ? getTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod)
                        : '18:00',
                },
                isLive: Boolean(state.isLive),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {
            console.error('Error saving draft state to LocalStorage:', e);
        }
    }

    function restoreDraftState() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return false;
            const draft = JSON.parse(raw);
            if (!draft || typeof draft !== 'object') return false;

            if (typeof draft.isLive === 'boolean') {
                state.isLive = draft.isLive;
            }

            // Restore Hours mode settings
            if (draft.hours) {
                if (draft.hours.start) {
                    setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, draft.hours.start);
                }
                if (draft.hours.end) {
                    setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, draft.hours.end);
                }
                if (typeof draft.hours.userOvernightForced === 'boolean') {
                    state.userOvernightForced = draft.hours.userOvernightForced;
                }
            }

            // Restore Dates mode settings
            if (draft.dates) {
                if (draft.dates.startDate && elements.datesStartD) {
                    elements.datesStartD.value = draft.dates.startDate;
                }
                if (draft.dates.startTime && elements.datesStartH && elements.datesStartM && elements.datesStartPeriod) {
                    setTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod, draft.dates.startTime);
                }
                if (draft.dates.endDate && elements.datesEndD) {
                    elements.datesEndD.value = draft.dates.endDate;
                }
                if (draft.dates.endTime && elements.datesEndH && elements.datesEndM && elements.datesEndPeriod) {
                    setTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod, draft.dates.endTime);
                }
            }

            // Restore Mode Tab selection
            if (draft.currentMode === 'dates') {
                state.currentMode = 'dates';
                elements.tabDates.classList.add('active');
                elements.tabDates.setAttribute('aria-selected', 'true');
                elements.tabHours.classList.remove('active');
                elements.tabHours.setAttribute('aria-selected', 'false');
                elements.modeDatesView.classList.remove('hidden');
                elements.modeHoursView.classList.add('hidden');
            } else {
                state.currentMode = 'hours';
                elements.tabHours.classList.add('active');
                elements.tabHours.setAttribute('aria-selected', 'true');
                elements.tabDates.classList.remove('active');
                elements.tabDates.setAttribute('aria-selected', 'false');
                elements.modeHoursView.classList.remove('hidden');
                elements.modeDatesView.classList.add('hidden');
            }

            return true;
        } catch (e) {
            console.error('Error restoring draft state from LocalStorage:', e);
            return false;
        }
    }

    // =========================================================================
    // Saved Intervals Store & Rendering
    // =========================================================================
    function loadIntervals() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                state.intervals = JSON.parse(raw);
            } else {
                state.intervals = [];
            }
        } catch (e) {
            console.error('Error loading intervals from LocalStorage:', e);
            state.intervals = [];
        }
    }

    function saveIntervals() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.intervals));
        } catch (e) {
            console.error('Error saving intervals to LocalStorage:', e);
            showToast('Failed to save to browser storage', 'error');
        }
        renderIntervals();
    }

    function addInterval(item) {
        state.intervals.unshift(item);
        saveIntervals();
        showToast(`Interval added (${formatDuration(item.totalSeconds, item.mode === 'dates')})`, 'success');
    }

    function deleteInterval(id) {
        const idx = state.intervals.findIndex((s) => s.id === id);
        if (idx !== -1) {
            state.intervals.splice(idx, 1);
            saveIntervals();
            showToast('Interval removed', 'info');
        }
    }

    function updateInterval(id, updatedFields) {
        const item = state.intervals.find((s) => s.id === id);
        if (item) {
            Object.assign(item, updatedFields);
            saveIntervals();
            showToast('Interval updated', 'success');
        }
    }

    function clearAllIntervals() {
        if (state.intervals.length === 0) {
            showToast('List is already empty', 'info');
            return;
        }
        if (confirm('Are you sure you want to clear all saved intervals?')) {
            if (state.editingId) {
                resetEditMode();
            }
            state.intervals = [];
            saveIntervals();
            showToast('All saved intervals cleared', 'info');
        }
    }

    function renderIntervals() {
        const totalSeconds = state.intervals.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
        const count = state.intervals.length;
        const avgSeconds = count > 0 ? Math.round(totalSeconds / count) : 0;
        const totalMins = Math.floor(totalSeconds / 60);
        const decimalHours = (totalSeconds / 3600).toFixed(2);

        // Update Top Stats
        const formattedTotal = formatDuration(totalSeconds);
        elements.statCount.textContent = count;
        elements.statTotalQuick.textContent = formattedTotal;
        if (elements.statAvgQuick) elements.statAvgQuick.textContent = formatDuration(avgSeconds);

        // Empty State vs Items List
        if (count === 0) {
            elements.entriesEmpty.classList.remove('hidden');
            elements.entriesListWrap.classList.add('hidden');
            elements.entriesListWrap.innerHTML = '';
            return;
        }

        elements.entriesEmpty.classList.add('hidden');
        elements.entriesListWrap.classList.remove('hidden');

        // Render List Rows
        elements.entriesListWrap.innerHTML = state.intervals
            .map((item, index) => {
                const itemNum = count - index;
                const decHours = (item.totalSeconds / 3600).toFixed(2);
                const isEditing = state.editingId === item.id;

                let rangeText = '';
                if (item.mode === 'dates') {
                    rangeText = `<span>${formatDateDisplay(item.start)}</span> <span class="arrow">→</span> <span>${formatDateDisplay(item.end)}</span>`;
                } else {
                    const overnightBadge = item.isNextDay ? '<span class="item-overnight-tag">+1d</span>' : '';
                    const startDisp = formatTimeDisplay(item.start);
                    const endDisp = formatTimeDisplay(item.end);
                    rangeText = `<span>${startDisp}</span> <span class="arrow">→</span> <span>${endDisp}</span> ${overnightBadge}`;
                }

                return `
                <div class="saved-item-row ${isEditing ? 'is-editing' : ''}" data-id="${item.id}">
                    <div class="item-left">
                        <span class="item-num">#${itemNum}</span>
                        <div class="item-range">${rangeText}</div>
                    </div>
                    <div class="item-right">
                        <div class="item-duration-wrap">
                            <span class="item-duration-main">${formatDuration(item.totalSeconds, item.mode === 'dates')}</span>
                            <span class="item-duration-sub">${decHours}h</span>
                        </div>
                        <div class="item-actions">
                            <button class="action-icon-btn btn-action-edit" data-id="${item.id}" title="Edit interval">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            <button class="action-icon-btn action-icon-delete btn-action-delete" data-id="${item.id}" title="Delete interval">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                `;
            })
            .join('');
    }

    // =========================================================================
    // Export / Import / Copy Report
    // =========================================================================
    function copySummaryReport() {
        if (state.intervals.length === 0) {
            showToast('No saved intervals to copy', 'error');
            return;
        }

        const totalSeconds = state.intervals.reduce((sum, s) => sum + (s.totalSeconds || 0), 0);
        const count = state.intervals.length;
        const avgSeconds = count > 0 ? Math.round(totalSeconds / count) : 0;
        const formattedTotal = formatDuration(totalSeconds);
        const formattedAvg = formatDuration(avgSeconds);

        let report = `Format: ${state.timeFormat.toUpperCase()}\n`;
        report += `Total Intervals: ${count}\n`;
        report += `Total Duration: ${formattedTotal}\n`;
        report += `Average Duration: ${formattedAvg}\n`;
        report += `════════════════════════════════════\n`;

        const rows = state.intervals.map((item, i) => {
            const num = count - i;
            let range = '';
            if (item.mode === 'dates') {
                const startDisp = formatDateDisplay(item.start);
                const endDisp = formatDateDisplay(item.end);
                range = `${startDisp} — ${endDisp}`;
            } else {
                const startDisp = formatTimeDisplay(item.start);
                const endDisp = formatTimeDisplay(item.end);
                range = `${startDisp} — ${endDisp}${item.isNextDay ? ' (+1d)' : ''}`;
            }
            return {
                num,
                range,
                duration: formatDuration(item.totalSeconds, item.mode === 'dates'),
            };
        });

        const maxRangeLen = Math.max(22, ...rows.map((r) => r.range.length));
        rows.forEach((r) => {
            report += `#${r.num}  ${r.range.padEnd(maxRangeLen + 2)}  ${r.duration}\n`;
        });

        navigator.clipboard.writeText(report).then(
            () => {
                const btnText = document.getElementById('copy-summary-text');
                const prev = btnText.textContent;
                btnText.textContent = 'Copied!';
                showToast('Report copied to clipboard', 'success');
                setTimeout(() => (btnText.textContent = prev), 2000);
            },
            () => {
                showToast('Failed to copy to clipboard', 'error');
            }
        );
    }

    function exportToCsv() {
        if (state.intervals.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        const headers = ['#', 'Mode', 'Start', 'End', 'Next Day', 'Duration', 'Decimal Hours', 'Seconds'];
        const rows = state.intervals.map((s, i) => [
            state.intervals.length - i,
            s.mode,
            s.start,
            s.end,
            s.isNextDay ? 'Yes' : 'No',
            `"${formatDuration(s.totalSeconds, s.mode === 'dates')}"`,
            (s.totalSeconds / 3600).toFixed(2),
            s.totalSeconds,
        ]);

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
        downloadFile(csvContent, 'time_calculator_export.csv', 'text/csv;charset=utf-8;');
        showToast('Exported to CSV successfully', 'success');
    }

    function exportToJson() {
        if (state.intervals.length === 0) {
            showToast('No data to export', 'error');
            return;
        }

        const jsonStr = JSON.stringify(state.intervals, null, 2);
        downloadFile(jsonStr, 'time_calculator_backup.json', 'application/json');
        showToast('Exported to JSON successfully', 'success');
    }

    function handleFileImport(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    if (state.editingId) {
                        resetEditMode();
                    }
                    state.intervals = imported;
                    saveIntervals();
                    showToast(`Imported ${imported.length} intervals`, 'success');
                } else {
                    showToast('Invalid JSON format (array expected)', 'error');
                }
            } catch (err) {
                showToast('Error parsing JSON file', 'error');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    }

    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // =========================================================================
    // In-Place Interval Editing Logic
    // =========================================================================
    function startEditingInterval(id) {
        const item = state.intervals.find((s) => s.id === id);
        if (!item) return;

        if (state.isLive) setLiveMode(false, false);
        state.editingId = id;

        if (item.mode === 'dates') {
            // Switch to Dates tab
            state.currentMode = 'dates';
            elements.tabDates.classList.add('active');
            elements.tabDates.setAttribute('aria-selected', 'true');
            elements.tabHours.classList.remove('active');
            elements.tabHours.setAttribute('aria-selected', 'false');
            elements.modeDatesView.classList.remove('hidden');
            elements.modeHoursView.classList.add('hidden');

            const [startDate, startTime] = (item.start || '').split('T');
            const [endDate, endTime] = (item.end || '').split('T');

            if (startDate) elements.datesStartD.value = startDate;
            if (startTime) setTimePickerValue(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod, startTime);
            if (endDate) elements.datesEndD.value = endDate;
            if (endTime) setTimePickerValue(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod, endTime);

            updateDatesCalculation();

            const textSpan = elements.btnAddDatesEntry.querySelector('.btn-text');
            if (textSpan) textSpan.textContent = 'Update Interval';
            elements.btnAddDatesEntry.classList.add('is-update');
            elements.btnCancelDatesEdit.classList.remove('hidden');

            // Reset hours button just in case
            const hoursText = elements.btnAddHoursEntry.querySelector('.btn-text');
            if (hoursText) hoursText.textContent = 'Save Interval to List';
            elements.btnAddHoursEntry.classList.remove('is-update');
            elements.btnCancelHoursEdit.classList.add('hidden');
        } else {
            // Switch to Hours tab
            state.currentMode = 'hours';
            elements.tabHours.classList.add('active');
            elements.tabHours.setAttribute('aria-selected', 'true');
            elements.tabDates.classList.remove('active');
            elements.tabDates.setAttribute('aria-selected', 'false');
            elements.modeHoursView.classList.remove('hidden');
            elements.modeDatesView.classList.add('hidden');

            setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, item.start || '10:00');
            setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, item.end || '11:00');
            state.userOvernightForced = Boolean(item.isNextDay);
            elements.checkNextDay.checked = Boolean(item.isNextDay);

            updateHoursCalculation();

            const textSpan = elements.btnAddHoursEntry.querySelector('.btn-text');
            if (textSpan) textSpan.textContent = 'Update Interval';
            elements.btnAddHoursEntry.classList.add('is-update');
            elements.btnCancelHoursEdit.classList.remove('hidden');

            // Reset dates button just in case
            const datesText = elements.btnAddDatesEntry.querySelector('.btn-text');
            if (datesText) datesText.textContent = 'Save Interval to List';
            elements.btnAddDatesEntry.classList.remove('is-update');
            elements.btnCancelDatesEdit.classList.add('hidden');
        }

        renderIntervals();
        showToast('Interval loaded into calculator for editing', 'info');
    }

    function resetEditMode() {
        state.editingId = null;
        state.userOvernightForced = false;

        const hoursText = elements.btnAddHoursEntry.querySelector('.btn-text');
        if (hoursText) hoursText.textContent = 'Save Interval to List';
        elements.btnAddHoursEntry.classList.remove('is-update');
        elements.btnCancelHoursEdit.classList.add('hidden');

        const datesText = elements.btnAddDatesEntry.querySelector('.btn-text');
        if (datesText) datesText.textContent = 'Save Interval to List';
        elements.btnAddDatesEntry.classList.remove('is-update');
        elements.btnCancelDatesEdit.classList.add('hidden');

        renderIntervals();
    }

    // =========================================================================
    // Event Listeners Setup
    // =========================================================================
    function setupEventListeners() {
        // Mode Tabs
        elements.tabHours.addEventListener('click', () => {
            if (state.currentMode !== 'hours') {
                if (state.editingId) {
                    resetEditMode();
                }
                state.currentMode = 'hours';
                elements.tabHours.classList.add('active');
                elements.tabHours.setAttribute('aria-selected', 'true');
                elements.tabDates.classList.remove('active');
                elements.tabDates.setAttribute('aria-selected', 'false');

                elements.modeHoursView.classList.remove('hidden');
                elements.modeDatesView.classList.add('hidden');

                if (state.isLive) {
                    setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, getCurrentTimeString());
                    updateHoursCalculation(new Date().getSeconds());
                } else {
                    updateHoursCalculation();
                }
            }
        });

        elements.tabDates.addEventListener('click', () => {
            if (state.currentMode !== 'dates') {
                if (state.editingId) {
                    resetEditMode();
                }
                state.currentMode = 'dates';
                elements.tabDates.classList.add('active');
                elements.tabDates.setAttribute('aria-selected', 'true');
                elements.tabHours.classList.remove('active');
                elements.tabHours.setAttribute('aria-selected', 'false');

                elements.modeDatesView.classList.remove('hidden');
                elements.modeHoursView.classList.add('hidden');

                if (state.isLive) {
                    setDatesEndDateTime(new Date());
                    updateDatesCalculation(new Date().getSeconds());
                } else {
                    updateDatesCalculation();
                }
            }
        });

        // 24H / 12H Format Switcher
        elements.btnFormat24h.addEventListener('click', () => setTimeFormat('24h'));
        elements.btnFormat12h.addEventListener('click', () => setTimeFormat('12h'));

        // LIVE Buttons & Top Badge toggle
        if (elements.btnLiveHours) elements.btnLiveHours.addEventListener('click', toggleLiveMode);
        if (elements.btnLiveDates) elements.btnLiveDates.addEventListener('click', toggleLiveMode);
        if (elements.statusBadge) {
            elements.statusBadge.addEventListener('click', toggleLiveMode);
            elements.statusBadge.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleLiveMode();
                }
            });
        }

        // Custom Time Pickers
        setupCustomTimePicker(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, updateHoursCalculation);
        setupCustomTimePicker(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, updateHoursCalculation, () => {
            if (state.isLive) setLiveMode(false, false);
        });
        setupCustomTimePicker(elements.datesStartH, elements.datesStartM, elements.datesStartPeriod, updateDatesCalculation);
        setupCustomTimePicker(elements.datesEndH, elements.datesEndM, elements.datesEndPeriod, updateDatesCalculation, () => {
            if (state.isLive) setLiveMode(false, false);
        });

        elements.checkNextDay.addEventListener('change', () => {
            state.userOvernightForced = elements.checkNextDay.checked;
            updateHoursCalculation();
        });

        // "Now" buttons
        elements.btnStartNow.addEventListener('click', () => {
            setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, getCurrentTimeString());
            updateHoursCalculation();
        });

        elements.btnEndNow.addEventListener('click', () => {
            setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, getCurrentTimeString());
            updateHoursCalculation();
        });

        // 8 Time Control Buttons (+1h, -1h, +5min, -5min, +4h, -4h, +15min, -15min)
        document.querySelectorAll('.adjust-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target || 'end';
                const mins = parseInt(e.currentTarget.dataset.mins, 10) || 0;
                adjustTime(target, mins);
            });
        });

        // Add / Update Hours Entry
        elements.btnAddHoursEntry.addEventListener('click', () => {
            const start = getStartTime24();
            const end = getEndTime24();
            const forceNextDay = elements.checkNextDay.checked;
            const res = calculateHoursDiff(start, end, forceNextDay);

            const editingItem = state.editingId ? state.intervals.find((s) => s.id === state.editingId) : null;
            if (editingItem && editingItem.mode === 'hours') {
                updateInterval(state.editingId, {
                    mode: 'hours',
                    start,
                    end,
                    isNextDay: res.isNextDay,
                    totalSeconds: res.totalSeconds,
                });
                resetEditMode();
            } else {
                if (state.editingId) resetEditMode();
                const newEntry = {
                    id: 'int_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    mode: 'hours',
                    start,
                    end,
                    isNextDay: res.isNextDay,
                    totalSeconds: res.totalSeconds,
                    createdAt: Date.now(),
                };
                addInterval(newEntry);
            }
        });

        elements.btnCancelHoursEdit.addEventListener('click', resetEditMode);

        // Mode 2: Dates inputs
        elements.datesStartD.addEventListener('input', updateDatesCalculation);
        elements.datesStartD.addEventListener('change', updateDatesCalculation);
        elements.datesEndD.addEventListener('input', () => {
            if (state.isLive) setLiveMode(false, false);
            updateDatesCalculation();
        });
        elements.datesEndD.addEventListener('change', () => {
            if (state.isLive) setLiveMode(false, false);
            updateDatesCalculation();
        });

        elements.btnDateStartNow.addEventListener('click', () => {
            setDatesStartDateTime(new Date());
            updateDatesCalculation();
        });

        elements.btnDateEndNow.addEventListener('click', () => {
            setDatesEndDateTime(new Date());
            updateDatesCalculation();
        });

        // Add / Update Dates Entry
        elements.btnAddDatesEntry.addEventListener('click', () => {
            const start = getDatesStartDateTime();
            const end = getDatesEndDateTime();
            const res = calculateDatesDiff(start, end);

            if (res.invalid) {
                showToast('End date must be after start date', 'error');
                return;
            }

            const editingItem = state.editingId ? state.intervals.find((s) => s.id === state.editingId) : null;
            if (editingItem && editingItem.mode === 'dates') {
                updateInterval(state.editingId, {
                    mode: 'dates',
                    start,
                    end,
                    isNextDay: false,
                    totalSeconds: res.totalSeconds,
                });
                resetEditMode();
            } else {
                if (state.editingId) resetEditMode();
                const newEntry = {
                    id: 'int_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    mode: 'dates',
                    start,
                    end,
                    isNextDay: false,
                    totalSeconds: res.totalSeconds,
                    createdAt: Date.now(),
                };
                addInterval(newEntry);
            }
        });

        elements.btnCancelDatesEdit.addEventListener('click', resetEditMode);

        // Global Nav Actions
        elements.btnClearAll.addEventListener('click', clearAllIntervals);
        elements.btnCopySummary.addEventListener('click', copySummaryReport);

        // Export Dropdown
        elements.btnExportDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = elements.exportMenu.classList.contains('hidden');
            if (isHidden) {
                const rect = elements.btnExportDropdown.getBoundingClientRect();
                elements.exportMenu.style.top = `${rect.bottom + 6}px`;
                if (rect.left + 180 > window.innerWidth) {
                    elements.exportMenu.style.left = 'auto';
                    elements.exportMenu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
                } else {
                    elements.exportMenu.style.left = `${rect.left}px`;
                    elements.exportMenu.style.right = 'auto';
                }
                elements.exportMenu.classList.remove('hidden');
            } else {
                elements.exportMenu.classList.add('hidden');
            }
        });

        document.addEventListener('click', () => {
            elements.exportMenu.classList.add('hidden');
        });

        elements.exportCsvBtn.addEventListener('click', exportToCsv);
        elements.exportJsonBtn.addEventListener('click', exportToJson);
        elements.importJsonBtn.addEventListener('click', () => elements.fileImport.click());
        elements.fileImport.addEventListener('change', handleFileImport);

        // List Action Delegations (Edit / Delete)
        elements.entriesListWrap.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-action-delete');
            if (delBtn) {
                if (state.editingId === delBtn.dataset.id) {
                    resetEditMode();
                }
                deleteInterval(delBtn.dataset.id);
                return;
            }

            const editBtn = e.target.closest('.btn-action-edit');
            if (editBtn) {
                startEditingInterval(editBtn.dataset.id);
                return;
            }
        });
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        // Set initial format toggle button state
        if (state.timeFormat === '12h') {
            elements.btnFormat12h.classList.add('active');
            elements.btnFormat24h.classList.remove('active');
        } else {
            elements.btnFormat24h.classList.add('active');
            elements.btnFormat12h.classList.remove('active');
        }

        initLiveClock();

        const restored = restoreDraftState();
        if (!restored) {
            // First visit: Initialize pickers with default times
            setTimePickerValue(elements.timeStartH, elements.timeStartM, elements.timeStartPeriod, '10:00');
            setTimePickerValue(elements.timeEndH, elements.timeEndM, elements.timeEndPeriod, '11:30');

            const now = new Date();
            const future = new Date();
            future.setDate(future.getDate() + 3);
            future.setHours(18, 0, 0, 0);

            setDatesStartDateTime(now);
            setDatesEndDateTime(future);
        } else {
            // In case of incomplete draft date values, ensure sensible defaults
            if (!elements.datesStartD.value) {
                setDatesStartDateTime(new Date());
            }
            if (!elements.datesEndD.value) {
                const future = new Date();
                future.setDate(future.getDate() + 3);
                future.setHours(18, 0, 0, 0);
                setDatesEndDateTime(future);
            }
        }

        loadIntervals();
        setupEventListeners();
        setLiveMode(state.isLive, false);
        if (state.isLive) {
            syncEndTimeToCurrent(new Date().getSeconds());
        } else {
            updateHoursCalculation();
            updateDatesCalculation();
        }
        renderIntervals();

        isInitializing = false;
        saveDraftState();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
