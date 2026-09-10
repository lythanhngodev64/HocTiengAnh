# Trạng thái bản 41 chủ đề — 2026-09-10

## Đã triển khai trên máy

- 41 chủ đề, 427 mục học riêng biệt, 461 lượt mục trong các chủ đề; thêm 6 từ ví dụ cho bảng chữ cái.
- 120 mã từ cũ được giữ. Bộ kiểm tra di chuyển tiến độ xác nhận giữ sao/từ đã nhớ và tính lại huy hiệu.
- 349 mục dùng tranh: 120 tranh cũ và 229 tranh mới. Các chữ, số, màu, hình khối, ngày và tháng dùng thẻ chính xác bằng giao diện.
- Hình mới tạo bằng công cụ ImageGen tích hợp, gồm 26 tấm 3×3 tại `public/images/sheets/`. Ba bản sửa mái nhà, cháo và bé nấu ăn tại `public/images/vocabulary/*-reviewed.png`.
- Bộ prompt đầy đủ: [illustration-prompts.json](illustration-prompts.json). Prompt sửa và ghi chú rà hình: [illustration-review.json](illustration-review.json).
- Bộ chọn 7 nhóm/41 chủ đề, tối đa 8 thẻ mỗi trang, bài tối đa 10 câu không lặp. Tên chữ và âm chữ tách riêng, không đưa C và K vào cùng câu nghe âm.

## Kết quả kiểm tra

- PASS: 5 bài kiểm tra tự động, lint, TypeScript, build với base `/HocTiengAnh/`, kiểm tra cú pháp Windows PowerShell và JavaScript.
- PASS: kiểm tra 154 đường dẫn của bản dựng qua HTTP, gồm toàn bộ các tệp hình đang tham chiếu, JS/CSS, manifest và hai tệp MP3 mẫu cũ. Không có 404 hoặc HTML trả thay tài nguyên.
- PASS: thao tác trực tiếp bài 10 câu, bài 8 câu, bài 4 mùa; lần lượt ghi nhận 4/10, 2/8, 1/4 đúng với lựa chọn lần đầu. Không lặp mục trong các bài đã thử.
- PASS: làm lại bài, trang từ vựng 8+4 thẻ, chọn chủ đề trên điện thoại, không cuộn ngang ở 390×844. Các thao tác chấm điểm dùng origin localhost riêng, không thay đổi tiến độ origin 127.0.0.1 của bé.
- PASS: vùng bốn đáp án và phản hồi vừa màn hình 1366×768 và 1280×720. Bài chữ cái trên HD 1280×720 có cuối vùng phản hồi ở khoảng 716 px khi giọng dự phòng hiển thị.
- PASS: âm chữ chưa duyệt bị khóa. Không gọi giọng máy để đọc âm chữ.

## Chưa hoàn tất, chưa xuất bản

- Phiên làm việc không có `OPENAI_API_KEY`; chưa gọi API tạo giọng mới.
- Còn 313 mục thiếu cặp giọng thường/chậm (626 tệp); bao gồm tên chữ và 6 từ ví dụ.
- Còn 26 âm chữ, mỗi âm có hai bản (52 tệp), chưa tạo và chưa nghe duyệt.
- `npm run content:check` hiện trả lỗi đúng dự kiến vì thiếu âm thanh. Không thiếu hình hoặc lỗi cấu trúc nội dung.
- Workflow GitHub Pages kiểm tra đủ nội dung trước khi xuất bản. Chưa commit/push/deploy bản mở rộng này.

## Bước tiếp theo

Chạy `npm run audio:generate`, rồi `npm run audio:phonics` với khóa API trên máy. Nghe rà các bản từ mới; nghe cả hai tệp của từng âm chữ và chỉ duyệt âm đạt theo hướng dẫn README. Sau đó chạy lại `npm run content:check`, dựng lại, kiểm tra phát âm thực tế và mới xuất bản.
