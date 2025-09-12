## Finance Bot (Telegram + Google Sheets via Apps Script)

[Vietnamese README](Readme.vi.md)

A lightweight Telegram bot to log income/expenses and generate reports, backed by Google Sheets.

### 1) Quick setup
Open `finance.gs` (or `finance_vietnamese` for vietnamese text) and set these constants:

```
const TOKEN     = '<TELEGRAM_BOT_TOKEN>'; // from BotFather
const SHEET_ID  = '<GOOGLE_SHEET_ID>';    // from your Google Sheet URL
const ADMIN_IDS = ['<admin_id_1>', '<admin_id_2>'];
```

Notes:
- Replace placeholders with your real values before deployment.

### 2) Prepare Google Sheet
- Create a Google Sheet (or reuse an existing one) and copy its ID as `SHEET_ID`.
- On first run, the script creates two sheets if missing:
  - `transactions`: headers `Timestamp, Type, Amount, Description`
  - `users`: headers `UserID`

### 3) Deploy Apps Script as Web App
1. Go to `script.google.com`, create a new Apps Script project.
2. Create a file `finance.gs` and paste the source code.
3. Deploy → New deployment → Type: Web app.
4. Execute as: Me, Who has access: Anyone.
5. Deploy and copy the Web App URL (looks like `https://script.google.com/.../exec`).

### 4) Set Telegram webhook
Access this url: https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WEB_APP_URL>

Re-run webhook setup whenever you re-deploy and the Web App URL changes.

### 5) Access control
- Admins (IDs in `ADMIN_IDS`) always have access.
- Other users must be added to the `users` sheet or via admin command `/addusers <id>`.

### 6) Usage
- Send `/start` to see the help menu with quick buttons:
  - This month's total expenses
  - This month's total income
  - This month's balance
  - Last 3 months (income/expense)
  - Entry guide

- Send `/help` to see the full command list.

### 7) Quick entry (recommended)
Type using:

```
<amount> <thu|chi> <description>
```

Examples: `14629k thu Salary T1`

Amount suffixes:
- `k` = thousand (1,000)
- `m` or `tr` = million (1,000,000)
- `b` = billion (1,000,000,000)

Thousands separators (comma/dot) are accepted and normalized.

### 8) Commands
- `/report [mm/yyyy | dd/mm/yyyy] [az|za]`: Report by month or specific day; sorted ascending/descending by amount (`za` default = highest first).
- `/undo`: Delete your last transaction.
- `/reset`: Clear all transactions (Admin only).
- `/addusers <id>`: Add a user ID (Admin).
- `/delusers <id>`: Remove a user ID (Admin).
- `/ping`: Health check.
- `/whoami`: See your ID and display name.

### 9) Technical notes
- Time zone/format in messages: `en-GB` locale; currency formatting uses `vi-VN` for VND.
- Webhook entry point: `doPost`.
- Data storage: one row per transaction in `transactions`.
- Telegram message limit ~4096 chars; long reports are split into multiple messages.

### 10) Troubleshooting
- Not receiving updates: ensure webhook is set to the correct Web App URL.
- Permission errors: ensure Web App deployment allows public access as needed.
- Cannot write to sheet: verify `SHEET_ID` and that the Apps Script account has access.

### 11) Security
- Never commit real `TOKEN` to public repos.
- Only add trusted IDs to `ADMIN_IDS`.


