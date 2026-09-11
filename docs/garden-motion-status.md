# Khu vườn chuyển động — đã bật trên bản local

Người dùng đã cho phép tách nền cục bộ. Đã xử lý các ảnh do Imagegen tạo bằng Pillow, giữ nguyên ảnh nguồn ngoài repo; không dùng API hoặc thay nội dung học. Chưa commit/push hoặc xuất bản.

## Đã tích hợp

- GardenScene thay canvas thỏ cũ ở trang chính; giữ Nunito và các nút học.
- Hai chim, hai bướm, hai lớp mây và cành lá; điện thoại giảm còn một chim/một bướm.
- Thỏ vẫy tay/nhún khi chạm, bướm bay vòng, không ghi tiến độ hoặc phát âm thanh.
- Nút tạm dừng, giảm chuyển động, dừng khi ẩn tab/unmount, cache ảnh và fallback khi ảnh lỗi.
- Tài nguyên: public/images/garden/garden-motion.png, motion-atlas.png, rabbit-wave.png. Ảnh nguồn được tạo bằng Imagegen theo prompt giữ phong cách truyện tranh khu vườn, bộ sprite 4×2 (chim xanh/vàng lên-xuống cánh; bướm mở/khép, mây, cành lá), thỏ cùng nhận dạng ở tư thế vẫy tay khác. Nền mới bỏ mây/cành trước để tránh lặp lớp.
- scripts/prepare-garden-alpha.py loại nền trung tính nối với mép ảnh, giữ vùng trắng bên trong nhân vật; xuất PNG RGBA và làm mềm viền. Đã kiểm tra ghép lên nền màu để xác nhận không còn ô caro.

## Kiểm tra

- Browser độc lập: PASS tại 1366×768, 1280×720, 390×844 và 320×740; không cuộn ngang, nút học và vùng chạm truy cập được.
- PASS: bàn phím, tạm dừng, giảm chuyển động, chạm nhanh, điều hướng rời trang chính, không thay localStorage, fallback khi ảnh lỗi.
- Ảnh chụp kiểm tra nằm ở outputs/garden-qa (không đưa vào Git).
- Chưa kiểm tra hiệu năng trên điện thoại vật lý hoặc vòng đời tab ẩn thực tế; chỉ có xử lý visibilitychange trong mã.
- Script browser: scripts/check-garden-browser.mjs, nhận đường dẫn module Playwright đã cài ngoài dự án.
