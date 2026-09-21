# Time Calculator

A fast, private, client-side time interval calculator and cumulative duration tracker with real-time statistics and offline PWA support.

<img width="2557" height="1087" alt="image" src="https://github.com/user-attachments/assets/3d1c1103-df9d-4f38-9b94-62fedafc366a" />


## Features

- **Dual Calculation Modes**: Calculate precise duration between times of day or across multiple calendar dates.
- **Overnight & Midnight Crossing**: Automatically computes intervals spanning past midnight (`+1d`) with decimal days and hours breakdown.
- **Quick Time Adjustments**: Rapidly increment or decrement start and end times with one-click buttons (`+1h`, `-1h`, `+15m`, `-15m`, `+5m`, `-5m`, etc.) or paste current time using **Now**.
- **Real-Time Breakdown**: Instant metric breakdown across Days, Hours, Minutes, and Seconds with live second-ticking status bar.
- **Cumulative Interval Tracker**: Save intervals into a docked manager with real-time total accumulated duration, count, and average interval calculation.
- **Data Export & Import**: Export intervals to CSV or JSON, import existing backups, and copy formatted summary reports to the clipboard.
- **24H / 12H Format Support**: Toggle effortlessly between 24-hour military/European format and 12-hour AM/PM format.
- **Local Persistence**: Automatically retains saved intervals, calculation inputs, and display preferences in `localStorage`.
- **Pure Static & Offline PWA**: Runs 100% locally in the browser with zero dependencies, no server requests, service worker caching, and complete privacy.

## Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism, Responsive Design)
- **Programming Language**: JavaScript (ES6+)
- **Typography**: Inter, JetBrains Mono

## Local Development

Since this project consists of standard static assets, no compilation or build steps are required.

To run locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/abi4ka/Time-Calculator.git
   cd Time-Calculator
   ```

2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in your web browser.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
