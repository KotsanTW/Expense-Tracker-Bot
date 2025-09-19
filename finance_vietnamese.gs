// Token bot Telegram (thay bằng token thật của bạn)
const TOKEN = '<TELEGRAM_BOT_TOKEN>'; // ví dụ: '123456:ABC...'
const API_URL = `https://api.telegram.org/bot${TOKEN}`;

// ID Google Sheet dùng để lưu dữ liệu
const SHEET_ID = '<GOOGLE_SHEET_ID>'; // ví dụ: '1AbC...'

// Danh sách user id Telegram có quyền admin
const ADMIN_IDS = ['<admin_id_1>', '<admin_id_2>']; // ví dụ: ['123456789']

function doPost(e) {
  const { message } = JSON.parse(e.postData.contents);
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;
  if (!isCommand(text)) {
    return;
  }

  // Các lệnh không cần uỷ quyền
  if (text.startsWith('/ping')) {
    sendMessage(chatId, 'pong');
    return;
  }
  if (text.startsWith('/whoami')) {
    const nameParts = [message.from.first_name, message.from.last_name].filter(Boolean);
    const name = nameParts.join(' ') || message.from.username || String(userId);
    sendMessage(chatId, `ID: ${userId}\nTên: ${name}`);
    return;
  }

  if (!isAuthorizedUser(userId)) {
    sendMessage(chatId, '🚫 Bạn không có quyền sử dụng bot này.');
    return;
  }

  if (text.startsWith('/start')) {
    sendStartMessage(chatId);
  } else if (text.startsWith('/help') || text.startsWith('/menu')) {
    sendHelpMenu(chatId);
  } else if (handleMenuSelection_(chatId, text)) {
    // đã xử lý bằng các nút
  } else if (text.startsWith('/tongchi')) {
    const { spend } = aggregateThisMonth_();
    sendMessage(chatId, `Tổng chi tháng này: ${formatCurrency_(spend)}`);
  } else if (text.startsWith('/tongthu')) {
    const { income } = aggregateThisMonth_();
    sendMessage(chatId, `Tổng thu tháng này: ${formatCurrency_(income)}`);
  } else if (text.startsWith('/sodu')) {
    const { income, spend } = aggregateThisMonth_();
    sendMessage(chatId, `Số dư tháng này: ${formatCurrency_(income - spend)}\nThu: ${formatCurrency_(income)} · Chi: ${formatCurrency_(spend)}`);
  } else if (text.startsWith('/last3')) {
    sendMessage(chatId, buildLast3MonthsText_());
  } else if (text.startsWith('/guide')) {
    sendMessage(chatId, quickEntryGuideText_());
  } else if (text.startsWith('/addusers') || text.startsWith('/delusers')) {
    if (!isAdmin(userId)) {
      sendMessage(chatId, '🚫 Bạn không phải là admin.');
      return;
    }
    manageUsers(chatId, userId, text);
  } else {
    if (text.startsWith('/report')) {
      handleReport(chatId, text);
    } else if (text.startsWith('/reset')) {
      resetSheet(chatId, userId);
    } else if (text.startsWith('/undo')) {
      undoLast(chatId);
    } else {
      const transactionPattern = /^[0-9][0-9.,]*(k|m|tr|b)?\s+(thu|chi)\s+.+/i;
      if (transactionPattern.test(text)) {
        handleTransaction(chatId, text);
      }
    }
  }
}

function isCommand(text) {
  if (!text) return false;

  const validCommands = ['/start', '/help', '/menu', '/addusers', '/delusers', '/report', '/reset', '/undo', '/tongchi', '/tongthu', '/sodu', '/last3', '/guide', '/ping', '/whoami'];
  if (validCommands.some(cmd => text.startsWith(cmd))) {
    return true;
  }
  const buttonLabels = [
    '📥 Tổng chi tháng hiện tại',
    '📤 Tổng thu tháng hiện tại',
    '💼 Số dư tháng hiện tại',
    '📅 Thu/Chi 3 tháng gần nhất',
    'ℹ️ Hướng dẫn nhập liệu'
  ];
  if (buttonLabels.includes(text)) return true;

  const transactionPattern = /^[0-9][0-9.,]*(k|m|tr|b)?\s+(thu|chi)\s+.+/i;
  return transactionPattern.test(text);
}

function handleMenuSelection_(chatId, text) {
  if (text === '📥 Tổng chi tháng hiện tại') {
    const { spend } = aggregateThisMonth_();
    sendMessage(chatId, `Tổng chi tháng này: ${formatCurrency_(spend)}`);
    return true;
  }
  if (text === '📤 Tổng thu tháng hiện tại') {
    const { income } = aggregateThisMonth_();
    sendMessage(chatId, `Tổng thu tháng này: ${formatCurrency_(income)}`);
    return true;
  }
  if (text === '💼 Số dư tháng hiện tại') {
    const { income, spend } = aggregateThisMonth_();
    sendMessage(chatId, `Số dư tháng này: ${formatCurrency_(income - spend)}\nThu: ${formatCurrency_(income)} · Chi: ${formatCurrency_(spend)}`);
    return true;
  }
  if (text === '📅 Thu/Chi 3 tháng gần nhất') {
    sendMessage(chatId, buildLast3MonthsText_());
    return true;
  }
  if (text === 'ℹ️ Hướng dẫn nhập liệu') {
    sendMessage(chatId, quickEntryGuideText_());
    return true;
  }
  return false;
}

function isAdmin(userId) {
  return ADMIN_IDS.includes(String(userId));
}

function isAuthorizedUser(userId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return ADMIN_IDS.includes(String(userId));
  const userIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  return ADMIN_IDS.includes(String(userId)) || userIds.includes(String(userId));
}

function sendStartMessage(chatId) {
  ensureSheetsExist();

  const startMessage = [
    'Finance Bot — Menu trợ giúp',
    '',
    'Chọn một mục bên dưới:',
    '- Tổng chi tiêu tháng hiện tại: /tongchi',
    '- Tổng thu tháng hiện tại: /tongthu',
    '- Số dư tháng hiện tại: /sodu',
    '- Thu/Chi 3 tháng gần nhất: /last3',
    '- Hướng dẫn nhập liệu: /guide',
    '',
    'Ngoài ra:',
    '- <số tiền> <thu|chi> <mô tả>  (VD: 14629k thu Lương T1)',
    '- /report  [mm/yyyy  |  dd/mm/yyyy]   [az|za]',
    '- /undo xoá giao dịch gần nhất',
    '- /reset xoá toàn bộ giao dịch (Admin)',
    '- /addusers <id>, /delusers <id> (Admin)',
    '- /ping, /whoami'
  ].join('\n');

  sendHelpKeyboardMessage(chatId, startMessage);
}

function sendHelpMenu(chatId) {
  const text = [
    'Finance Bot — Menu trợ giúp',
    '',
    'Chọn một mục bên dưới:',
    '- Tổng chi tiêu tháng hiện tại: /tongchi',
    '- Tổng thu tháng hiện tại: /tongthu',
    '- Số dư tháng hiện tại: /sodu',
    '- Thu/Chi 3 tháng gần nhất: /last3',
    '- Hướng dẫn nhập liệu: /guide',
    '',
    'Ngoài ra:',
    '- <số tiền> <thu|chi> <mô tả>  (VD: 14629k thu Lương T1)',
    '- /report  [mm/yyyy  |  dd/mm/yyyy]   [az|za]',
    '- /undo xoá giao dịch gần nhất',
    '- /reset xoá toàn bộ giao dịch (Admin)',
    '- /addusers <id>, /delusers <id> (Admin)',
    '- /ping, /whoami'
  ].join('\n');
  sendHelpKeyboardMessage(chatId, text);
}

function buildReplyKeyboard_() {
  return {
    keyboard: [
      [{ text: '📥 Tổng chi tháng hiện tại' }],
      [{ text: '📤 Tổng thu tháng hiện tại' }],
      [{ text: '💼 Số dư tháng hiện tại' }],
      [{ text: '📅 Thu/Chi 3 tháng gần nhất' }],
      [{ text: 'ℹ️ Hướng dẫn nhập liệu' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

function sendHelpKeyboardMessage(chatId, text) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: buildReplyKeyboard_()
  };
  UrlFetchApp.fetch(`${API_URL}/sendMessage`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

function getOrCreateUserSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let usersSheet = ss.getSheetByName('users');

  if (!usersSheet) {
    usersSheet = ss.insertSheet('users');
    usersSheet.appendRow(['UserID']);
  }

  return usersSheet;
}

function ensureSheetsExist() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let transactionsSheet = ss.getSheetByName('transactions');
  if (!transactionsSheet) {
    transactionsSheet = ss.insertSheet('transactions');
    transactionsSheet.appendRow(['Thời gian', 'Loại', 'Số tiền', 'Mô tả']);
  }

  let usersSheet = ss.getSheetByName('users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('users');
    usersSheet.appendRow(['UserID']);
  }
}

function handleTransaction(chatId, text) {
  const [amount, type, ...desc] = text.split(' ');
  if (!isValidAmount(amount) || !['thu', 'chi'].includes(type.toLowerCase())) {
    sendMessage(chatId, '⚠️ Lỗi: Vui lòng nhập đúng cú pháp:\n`<số tiền> <thu|chi> <mô tả>`');
    return;
  }

  const description = desc.join(' ');
  const formattedDesc = description.charAt(0).toUpperCase() + description.slice(1);
  const parsedAmount = parseAmount(amount);
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
  sheet.appendRow([new Date(), type.toLowerCase(), parsedAmount, formattedDesc || 'Không có mô tả']);

  const currentTime = new Date().toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour12: false
  });

  const responseMessage = [
    '✅ Thêm giao dịch thành công!',
    '',
    `⏰ Thời gian: ${currentTime}`,
    `💰 Số tiền: ${formatCurrency(parsedAmount)}`,
    `${type.toLowerCase() === 'thu' ? '📈' : '📉'} Loại: ${type.toLowerCase() === 'thu' ? 'Thu nhập' : 'Chi tiêu'}`,
    `📝 Mô tả: ${formattedDesc || 'Không có mô tả'}`
  ].join('\n');

  sendMessage(chatId, responseMessage);
}

function manageUsers(chatId, userId, text) {
  const args = text.split(' ');
  const command = args[0];
  const targetUserId = args[1];

  if (!targetUserId) {
    sendMessage(chatId, '🚫 Bạn cần cung cấp ID người dùng.');
    return;
  }

  if (command === '/addusers') {
    addUser(chatId, targetUserId);
  } else if (command === '/delusers') {
    removeUser(chatId, targetUserId);
  } else {
    sendMessage(chatId, '🚫 Lệnh không hợp lệ.');
  }
}

function addUser(chatId, targetUserId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  const existingUsers = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String)
    : [];

  if (existingUsers.includes(targetUserId)) {
    sendMessage(chatId, `🚫 Người dùng ID ${targetUserId} đã tồn tại.`);
    return;
  }

  sheet.appendRow([targetUserId]);
  sendMessage(chatId, `✅ Đã thêm người dùng với ID ${targetUserId}.`);
}

function removeUser(chatId, targetUserId) {
  const sheet = getOrCreateUserSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    sendMessage(chatId, '🚫 Không có người dùng nào trong danh sách.');
    return;
  }

  const userIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().map(String);
  const userIndex = userIds.indexOf(String(targetUserId));

  if (userIndex === -1) {
    sendMessage(chatId, `🚫 Không tìm thấy người dùng với ID ${targetUserId}.`);
    return;
  }

  sheet.deleteRow(userIndex + 2);
  sendMessage(chatId, `✅ Đã xoá người dùng với ID ${targetUserId}.`);
}

function handleReport(chatId, text) {
  const dateRegex = /\d{2}\/\d{4}|\d{2}\/\d{2}\/\d{4}/;
  const dateParam = text.match(dateRegex)?.[0];
  let filter = 'all';
  let sortOrder = null;

  if (text.includes('az')) {
    sortOrder = 'az';
  } else if (text.includes('za')) {
    sortOrder = 'za';
  }

  if (dateParam) {
    filter = dateParam.length === 7 ? 'month' : 'week';
  }

  generateReport(chatId, filter, dateParam, sortOrder);
}

function generateReport(chatId, filter, dateParam, sortOrder) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
  if (!sheet) {
    sendMessage(chatId, '⚠️ Lỗi: Không tìm thấy sheet `transactions`.');
    return;
  }

  const data = sheet.getDataRange().getValues().slice(1);

  if (!data.length) {
    sendMessage(chatId, '📊 Thông báo: Không có dữ liệu để tạo báo cáo.');
    return;
  }

  const now = parseDate(filter, dateParam);
  const filteredData = data.filter(([date]) =>
    isValidDate(new Date(date), filter, now)
  );

  if (sortOrder) {
    filteredData.sort((a, b) => {
      const amountA = a[2];
      const amountB = b[2];
      return sortOrder === 'az' ? amountA - amountB : amountB - amountA;
    });
  }

  const incomeTransactions = [];
  const expenseTransactions = [];
  let [income, expense] = [0, 0];

  filteredData.forEach(([date, type, amount, desc]) => {
    const formattedReportDate = new Date(date).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    });

    const transaction = `- ${formatCurrency(amount)} : ${desc || 'Không có mô tả'} | ${formattedReportDate}`;

    if (type === 'thu') {
      income += amount;
      incomeTransactions.push(transaction);
    } else if (type === 'chi') {
      expense += amount;
      expenseTransactions.push(transaction);
    }
  });

  if (!filteredData.length) {
    const range = filter === 'week' ? 'tuần' : 'tháng';
    sendMessage(chatId, `⚠️ Thông báo: Không có giao dịch nào trong ${range} được yêu cầu.`);
    return;
  }

  const weekInfo =
    filter === 'week'
      ? `\n📅 Thời gian: ${now.startOfWeek.toLocaleDateString('vi-VN')} - ${now.endOfWeek.toLocaleDateString('vi-VN')}`
      : '';

  let reportTitle;
  switch (filter) {
    case 'all':
      reportTitle = '📊 BÁO CÁO TỔNG HỢP';
      break;
    case 'month':
      reportTitle = `📊 BÁO CÁO THÁNG ${dateParam}`;
      break;
    case 'week':
      reportTitle = '📊 BÁO CÁO TUẦN';
      break;
  }

  const balance = income - expense;
  const balanceIcon = balance >= 0 ? '📈' : '📉';

  const report = [
    reportTitle,
    weekInfo,
    '',
    '💰 TỔNG QUAN',
    `├─ 📥 Thu nhập: ${formatCurrency(income)}`,
    `├─ 📤 Chi tiêu: ${formatCurrency(expense)}`,
    `└─ ${balanceIcon} Cân đối: ${formatCurrency(balance)}`,
    '',
    '📋 CHI TIẾT',
    '',
    '📥 Giao dịch thu nhập:',
    incomeTransactions.length ? incomeTransactions.join('\n') : '      💬 Không có giao dịch thu nhập',
    '',
    '📤 Giao dịch chi tiêu:',
    expenseTransactions.length ? expenseTransactions.join('\n') : '      💬 Không có giao dịch chi tiêu',
    '',
    sortOrder ? `\n🔄 Sắp xếp: ${sortOrder === 'az' ? 'Tăng dần' : 'Giảm dần'}` : '',
  ].filter(Boolean).join('\n');

  sendMessage(chatId, report);
}

function resetSheet(chatId, userId) {
  try {
    if (!isAdmin(userId)) {
      sendMessage(chatId, '🚫 Bạn không phải là admin.');
      return;
    }
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
    if (!sheet) {
      sendMessage(chatId, '⚠️ Lỗi: Không tìm thấy sheet `transactions`.');
      return;
    }
    sheet.clear();
    sheet.appendRow(['Thời gian', 'Loại', 'Số tiền', 'Mô tả']);
    sendMessage(chatId, '✅ Đã xoá toàn bộ dữ liệu.', true);
  } catch (error) {
    console.error('Lỗi trong hàm resetSheet:', error);
    sendMessage(chatId, '❌ Đã xảy ra lỗi khi xoá dữ liệu.', true);
  }
}

function undoLast(chatId) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('transactions');
    if (!sheet) {
      sendMessage(chatId, '⚠️ Lỗi: Không tìm thấy sheet `transactions`.');
      return;
    }
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRow(lastRow);
      sendMessage(chatId, '✅ Đã xoá giao dịch gần nhất.', true);
    } else {
      sendMessage(chatId, 'ℹ️ Không có giao dịch nào để xoá.', true);
    }
  } catch (error) {
    console.error('Lỗi trong hàm undoLast:', error);
    sendMessage(chatId, '❌ Đã xảy ra lỗi khi xoá giao dịch.', true);
  }
}

function isValidDate(date, filter, now) {
  if (filter === 'month') {
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }
  if (filter === 'week') {
    const { startOfWeek, endOfWeek } = now;
    return date >= startOfWeek && date <= endOfWeek;
  }
  return true;
}

function parseDate(filter, dateParam) {
  if (!dateParam) return new Date();
  const parts = dateParam.split('/');
  if (filter === 'month' && parts.length === 2) {
    return new Date(parts[1], parts[0] - 1);
  }
  if (filter === 'week' && parts.length === 3) {
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    const dayOfWeek = date.getDay() || 7;
    date.startOfWeek = new Date(date);
    date.startOfWeek.setDate(date.getDate() - dayOfWeek + 1);
    date.endOfWeek = new Date(date.startOfWeek);
    date.endOfWeek.setDate(date.startOfWeek.getDate() + 6);
    return date;
  }
  return new Date();
}

function parseAmount(amount) {
  // Chuẩn hoá hàng nghìn
  const normalized = amount.replace(/[.,\s]/g, '').toLowerCase();
  if (normalized.endsWith('b')) {
    return Number(normalized.slice(0, -1)) * 1000000000;
  }
  if (normalized.endsWith('m') || normalized.endsWith('tr')) {
    const base = normalized.endsWith('tr') ? normalized.slice(0, -2) : normalized.slice(0, -1);
    return Number(base) * 1000000;
  }
  if (normalized.endsWith('k')) {
    return Number(normalized.slice(0, -1)) * 1000;
  }
  return Number(normalized) || 0;
}

function isValidAmount(amount) {
  return /^[0-9][0-9.,]*(k|m|tr|b)?$/i.test(amount);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function sendMessage(chatId, text) {
  const MAX_MESSAGE_LENGTH = 4096;
  if (text.length <= MAX_MESSAGE_LENGTH) {
    UrlFetchApp.fetch(`${API_URL}/sendMessage`, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  } else {
    const parts = splitMessage(text, MAX_MESSAGE_LENGTH);
    parts.forEach(part => {
      UrlFetchApp.fetch(`${API_URL}/sendMessage`, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'Markdown' }),
      });
    });
  }
}

function splitMessage(text, maxLength) {
  const parts = [];
  while (text.length > maxLength) {
    let part = text.slice(0, maxLength);
    const lastNewLineIndex = part.lastIndexOf('\n');
    if (lastNewLineIndex > -1) {
      part = text.slice(0, lastNewLineIndex + 1);
    }
    parts.push(part);
    text = text.slice(part.length);
  }
  parts.push(text);
  return parts;
}

function aggregateThisMonth_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('transactions');
  if (!sh || sh.getLastRow() < 2) return { income: 0, spend: 0 };
  const values = sh.getDataRange().getValues().slice(1); // [Thời gian, Loại, Số tiền, Mô tả]
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  let income = 0, spend = 0;
  values.forEach(r => {
    const d = new Date(r[0]);
    const type = String(r[1]).toLowerCase();
    const amt = Number(r[2]) || 0;
    if (!isNaN(d) && d.getMonth() === m && d.getFullYear() === y) {
      if (type === 'thu') income += amt;
      else if (type === 'chi') spend += amt;
    }
  });
  return { income, spend };
}

function buildLast3MonthsText_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('transactions');
  if (!sh || sh.getLastRow() < 2) return 'Không có dữ liệu giao dịch.';
  const values = sh.getDataRange().getValues().slice(1);
  const now = new Date();
  const buckets = new Map(); // key: yyyy-mm
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { month: d.getMonth() + 1, year: d.getFullYear(), income: 0, spend: 0 });
  }
  values.forEach(r => {
    const d = new Date(r[0]);
    const type = String(r[1]).toLowerCase();
    const amt = Number(r[2]) || 0;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (buckets.has(key)) {
      const b = buckets.get(key);
      if (type === 'thu') b.income += amt; else if (type === 'chi') b.spend += amt;
    }
  });
  const lines = Array.from(buckets.values())
    .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month))
    .map(b => {
      const bal = b.income - b.spend;
      const icon = bal >= 0 ? '📈' : '📉';
      return `• ${String(b.month).padStart(2, '0')}/${b.year}  📥 ${formatCurrency_(b.income)}  |  📤 ${formatCurrency_(b.spend)}  |  ${icon} ${formatCurrency_(bal)}`;
    });
  return ['📆 Thu/Chi 3 tháng gần nhất', '', ...lines].join('\n');
}

function quickEntryGuideText_() {
  return [
    'ℹ️ Hướng dẫn nhập liệu',
    '',
    'Cú pháp: `<số tiền> <thu|chi> <mô tả>`',
    'Ví dụ: `14629k thu Lương T1`',
    'Hậu tố hỗ trợ: k=nghìn, tr|m=triệu, b=tỷ',
  ].join('\n');
}

function formatCurrency_(n) {
  return formatCurrency(Number(n) || 0);
}


