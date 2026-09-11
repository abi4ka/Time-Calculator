# Time Calculator & Cumulative Tracker ⏱️

A fast, private, client-side time interval calculator and cumulative duration tracker.
Designed with the exact modern dark glassmorphic aesthetics of [Json-Formatter](https://github.com/abi4ka/Json-Formatter), with zero external dependencies, 100% offline **PWA** support, and instant deployment to **GitHub Pages**.

---

## ✨ Key Features

### 1. Centered Calculator Stage
- Positioned prominently in the mathematical center of the workspace.
- **Time of Day Mode**:
  - Calculate exact time elapsed between two times.
  - **Overnight support (+1d)**: automatically handles intervals crossing midnight (e.g. `23:00` → `01:30` = `2h 30m`).
  - **Quick Time Controls (8 buttons per input)**: `+1h`, `-1h`, `+5min`, `-5min`, `+4h`, `-4h`, `+15min`, `-15min` on both Start and End boxes.
  - "Now" button to instantly paste current local time.
  - **Vertical 4-Metric Breakdown**: Days (decimal), Hours (decimal), Minutes (int), Seconds (int).
- **Between Dates Mode**:
  - Pick start and end dates with date pickers on top, custom time pickers in the middle, and 8 time adjustment buttons below.
  - Full overnight crossing and multi-day duration calculations.

### 2. Live Top Center Stats
- Centered directly in the top navigation bar:
  - **Live Clock**: real-time seconds ticking.
  - **Saved Intervals**: total count.
  - **Total Accumulated Time**: combined duration.
  - **Average Duration**: average per interval.

### 3. Saved Intervals Window (Docked Right)
- Clean, label-free tracking of time intervals.
- **Top Action Bar**:
  - **Export**: export to CSV, JSON, or import JSON backup.
  - **Clear**: 1-click clearing of all intervals.
  - **Copy**: copies a formatted text summary report to clipboard.
- In-place editing: click "Edit" on any interval to load its values into the center calculator, update, or cancel.
- Dynamic auto-fitting height that adapts to the number of items.
- Autosaved to `LocalStorage` (persists across page reloads).

### 4. 24H / 12H Format
- Top-right toggle to switch between European 24-Hour format (`14:30`) and 12-Hour AM/PM format (`02:30 PM`).

---

## 🚀 How to Run Locally

Since there are no build steps or dependencies:
- Simply double-click `index.html` to open it directly in any web browser.
- Or start a local server for testing the Service Worker / PWA:
  ```bash
  python3 -m http.server 8000
  ```
  and visit `http://localhost:8000`.

---

## 🌐 Deployment to GitHub Pages

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Time Calculator"
   ```

2. Create a new repository on GitHub:
   ```bash
   gh repo create Time-Calculator --public --source=. --remote=origin --push
   ```

3. On GitHub, go to **Settings** → **Pages** → choose branch `main` (folder `/ (root)`) and click **Save**.
   Your site will be live at `https://abi4ka.github.io/Time-Calculator/`!
