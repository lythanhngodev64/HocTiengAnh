# Hai bài kiểm tra ngắn — 2026-09-11

## Đã triển khai trên máy

- Cả 41 chủ đề có Bài 1/Bài 2 mở sẵn. Tách theo thứ tự từ hiện có, nhóm đầu nhận phần dư; mỗi lượt tối đa 5 câu. Các mùa: 2+2 câu; Các ngày: 4+3 câu.
- Luân phiên từ chưa luyện rồi từ lâu chưa luyện theo từng chế độ; xáo trộn những từ cùng mức ưu tiên. Chốt toàn bộ câu và đáp án khi bắt đầu lượt. Mỗi câu vẫn có 4 đáp án trong chủ đề, không có hai đáp án cùng âm cơ bản khi luyện âm chữ.
- Chọn bài khác khi đang làm dở (kể cả mới bấm nghe) phải xác nhận. Hủy không đổi lượt. Mở/đóng Quá trình học không khởi tạo lại bài.
- Điểm /100 và hiệu ứng từ 70 điểm giữ nguyên. Có nút Làm lại và Sang Bài 1/2; không tự chuyển hoặc tự phát âm thanh.
- Lịch sử mới lưu `testPart` 1 hoặc 2. Lịch sử cũ không có trường này vẫn theo độ dài cũ, không bị đổi điểm/gán số bài. Reset giữ nguyên cơ chế xóa toàn bộ dữ liệu, khởi tạo Bài 1 với tiến độ trống.
- Không thay đổi hình, âm thanh, chế độ Học hoặc quy trình GitHub Pages. Chưa commit/push trong đợt này.

## Kiểm tra

- PASS: 19 kiểm thử tự động, gồm đầy đủ 41 chủ đề và cả hai chế độ chữ cái; bài 2/3/4/5 câu; chọn sai rồi sửa; chống sự kiện trùng/cũ; luân phiên đủ vốn từ; lịch sử cũ/mới qua tuần tự hóa và đọc lại; dữ liệu lỗi và reset về trạng thái trống.
- PASS: TypeScript; kiểm tra nội dung không thiếu hình/âm thanh hoặc âm chữ chưa duyệt; build với đường dẫn `/HocTiengAnh/`.
- Đã cập nhật kịch bản kiểm thử trình duyệt từ bài 10 câu/90 điểm sang 5 câu/80 điểm và nhận diện Bài 1/Bài 2.
- NOT_RUN: kịch bản trình duyệt, F5/thao tác xác nhận thực tế, lỗi lưu trữ giả lập trên trình duyệt và kiểm tra trực quan tại 1366×768, 1280×720, điện thoại. CSS đã bổ sung bố cục hai nút cạnh nhau và hỗ trợ màn hình nhỏ; kiểm thử logic không thay thế kiểm thử trực tiếp này.

Các tài liệu trạng thái ngày 2026-09-10 là ảnh chụp tiến độ cũ, không phải kết quả kiểm thử của thay đổi hiện tại.
