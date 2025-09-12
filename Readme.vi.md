## Bot Quản Lý Thu Chi (Telegram + Google Sheets qua Apps Script)

[English README](Readme.md)

Một bot Telegram gọn nhẹ để ghi chép thu/chi và tạo báo cáo, lưu trữ trên Google Sheets.

### 1) Cài đặt nhanh
Mở file `finance.gs` và cấu hình các hằng số sau:

```
const TOKEN     = '<TELEGRAM_BOT_TOKEN>'; // token từ BotFather
const SHEET_ID  = '<GOOGLE_SHEET_ID>';    // ID từ URL Google Sheet
const ADMIN_IDS = ['<admin_id_1>', '<admin_id_2>'];
```

Ghi chú:
- Thay thế placeholder bằng giá trị thật trước khi deploy.
- Không commit token thật lên repo public.

### 2) Chuẩn bị Google Sheet
- Tạo 1 Google Sheet (hoặc dùng sẵn) và copy `SHEET_ID`.
- Lần chạy đầu, script sẽ tạo 2 sheet nếu chưa có:
  - `transactions`: header `Timestamp, Type, Amount, Description`
  - `users`: header `UserID`

### 3) Deploy Apps Script dạng Web App
1. Mở `script.google.com`, tạo project Apps Script mới.
2. Tạo file `finance.gs` và dán mã nguồn.
3. Deploy → New deployment → Type: Web app.
4. Execute as: Me; Who has access: Anyone.
5. Deploy và copy Web App URL (dạng `https://script.google.com/.../exec`).

### 4) Thiết lập Webhook cho Telegram
Trong Apps Script editor, chạy hàm hỗ trợ (ví dụ `setWebhook(url)`) với Web App URL của bạn, hoặc thiết lập webhook qua Telegram API. Ví dụ (pseudo):

```
setWebhook('https://script.google.com/macros/s/XXXX/exec')
```

Mỗi lần re-deploy khiến URL thay đổi, cần gọi lại webhook.

### 5) Quyền truy cập
- Admin (ID trong `ADMIN_IDS`) luôn có quyền.
- Người dùng khác: cần được thêm vào sheet `users` hoặc dùng lệnh admin `/addusers <id>`.

### 6) Cách sử dụng
- Gõ `/start` để mở menu và phím tắt:
  - Tổng chi tháng hiện tại
  - Tổng thu tháng hiện tại
  - Số dư tháng hiện tại
  - Thu/Chi 3 tháng gần nhất
  - Hướng dẫn nhập liệu

- Gõ `/help` để xem danh sách lệnh đầy đủ.

### 7) Nhập nhanh (khuyến nghị)
Soạn theo cú pháp:

```
<số tiền> <thu|chi> <mô tả>
```

Ví dụ: `14629k thu Lương T1`

Hậu tố số tiền:
- `k` = nghìn (1.000)
- `m` hoặc `tr` = triệu (1.000.000)
- `b` = tỷ (1.000.000.000)

Dấu phẩy/chấm ngăn cách hàng nghìn đều được chấp nhận.

### 8) Lệnh hỗ trợ
- `/report [mm/yyyy | dd/mm/yyyy] [az|za]`: Báo cáo theo tháng hoặc theo ngày; sắp xếp tăng/giảm theo số tiền (`za` mặc định).
- `/undo`: Xoá giao dịch gần nhất của bạn.
- `/reset`: Xoá toàn bộ giao dịch (chỉ Admin).
- `/addusers <id>`: Thêm user id (Admin).
- `/delusers <id>`: Xoá user id (Admin).
- `/ping`: Kiểm tra bot sống.
- `/whoami`: Xem ID và tên hiển thị của bạn.

### 9) Ghi chú kỹ thuật
- Định dạng thời gian hiển thị: `en-GB`; Tiền tệ dùng `vi-VN` cho VND.
- Webhook: điểm vào `doPost`.
- Lưu dữ liệu: mỗi giao dịch một dòng trong `transactions`.
- Tin nhắn Telegram tối đa ~4096 ký tự; báo cáo dài sẽ tự chia nhỏ.

### 10) Bảo mật
- Không commit `TOKEN` thật lên repo public.
- Chỉ thêm ID đáng tin vào `ADMIN_IDS`.

[English README](README.md)


