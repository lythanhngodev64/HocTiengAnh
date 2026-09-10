# Khu vườn và bài học nhỏ — bàn giao

## Đã triển khai

- Trang chính Học / Kiểm tra, tranh khu vườn + nhân vật thỏ chuyển động bằng canvas. Có hình tĩnh khi giảm chuyển động hoặc canvas không chạy; dừng khi tab ẩn.
- Bài Học giới thiệu tối đa 5 từ rồi luyện 2/3/4 hình từ chính nhóm từ vừa học. Mặc định 2 hình, không tự tăng mức khó.
- Ưu tiên tối đa 2 từ ôn (sai gần nhất, rồi lâu chưa luyện), bổ sung từ mới; giữ riêng tên chữ/âm chữ.
- Bốn phòng có 5 vùng chạm mỗi phòng; chạm nghe và nghe tìm, không tăng sao hay ghi điểm.
- Tiến độ/huy hiệu cũ được giữ; lịch sử cũ là Kiểm tra, bài mới phân biệt Học/Kiểm tra. Từ chọn sai trong lượt bỏ dở cũng được giữ để ôn, không nhận sao.
- Xác nhận khi rời bài dở; mở Quá trình học không làm mất lượt đang học.

## Đã duyệt: 7 lời hướng dẫn tiếng Việt

Ngày 10/09/2026, người dùng xác nhận đã nghe cả 7 tệp Marin và tất cả đều đạt. Đã duyệt đúng 7 tệp hiện có bằng SHA-256. Kiểm tra trả về `ready: true`, không thiếu tệp, không còn tệp chờ duyệt hoặc khác cấu hình. Máy chủ web cục bộ trả về manifest Marin với 7 mục được duyệt. Đây là kết quả nghe duyệt của người dùng, không phải nhận định nghe của công cụ tự động. Giọng từ vựng Coral và âm chữ giữ nguyên.

Quy trình tạo lại về sau (không cần chạy lại với bộ vừa duyệt):

1. Trong thư mục dự án chạy `npm run audio:guidance`. Công cụ PowerShell dùng cách nhập khóa cục bộ hiện có; không dán khóa vào chat hoặc đưa khóa lên GitHub.
2. Mở `http://127.0.0.1:5173/audio/guidance/review.html`, nghe hết 7 tệp: welcome, intro, choose, explore, find, retry, complete. Trang này dành riêng cho người lớn nghe ứng viên.
3. Chỉ khi tất cả đạt, chạy `node scripts/generate-guidance.mjs --approve-all --listened`.
4. Chạy `npm run audio:guidance:audit`; phải có `ready: true` rồi tải lại web. Nếu tạo lại bằng `--force`, tệp thay thế phải nghe duyệt lại.

Kiểm tra rõ dấu tiếng Việt, đủ câu, giọng tự nhiên, không bị cắt và không có tiếng nền. Manifest duyệt lưu SHA-256; web kiểm tra đúng tệp đã duyệt trước khi phát.

Tạo lời hướng dẫn bằng Marin / gpt-4o-mini-tts, tốc độ 1.0, theo [tài liệu Speech generation của OpenAI](https://developers.openai.com/api/docs/guides/text-to-speech). Lệnh mặc định tạo lại các tệp khác cấu hình; lần chạy tiếp bỏ qua các tệp đã tạo đúng cấu hình. Việc nghe duyệt cả 7 câu vẫn bắt buộc. Giọng từ vựng Coral và âm chữ không thay đổi.

## Tranh và nguồn

Sáu tranh mới tạo bằng công cụ imagegen tích hợp, đã xem và rà đối tượng:

- `public/images/garden/garden.png`: nền khu vườn.
- `public/images/garden/rabbit.png`: thỏ làm vườn, có kênh alpha trong suốt.
- `public/images/garden/bedroom.png`, `living.png`, `kitchen.png`, `bathroom.png`: bốn phòng.
- `public/images/garden/prompts.json`: toàn bộ prompt chính xác của 6 lần tạo.
- `public/images/garden/hitboxes.json`: vùng chạm theo phần trăm, đã kiểm tra không chồng nhau; giữ tranh vuông không cắt xén.

## Kiểm tra

- TypeScript, 13 kiểm tra tự động, kiểm tra nội dung từ/hình/âm từ vựng và build đều đạt. Đã chạy lại kiểm thử trình duyệt trên cả máy chủ phát triển và bản build có đường dẫn GitHub Pages `/HocTiengAnh/`.
- Bộ kiểm tra tự động: chọn từ ôn, 41 chủ đề, bài ngắn, đáp án không trùng âm, lịch sử cũ/mới, vùng chạm và tài nguyên.
- Trình duyệt Edge headless với hồ sơ mới, không dùng dữ liệu của bé: 1366×768, 1280×720, 390×844, 320×740; đã xem ảnh chụp trang chính và phòng. Các ảnh kiểm tra lưu trong `outputs/study-qa/` (không commit).
- Kiểm tra luồng bài Học, chọn sai rồi sửa, quay lại từ lịch sử, hủy rời bài, F5 giữ lịch sử; bài Kiểm tra 10 câu đạt 90/100; phòng không ghi sao/điểm; vùng chạm ít nhất 44px; giảm chuyển động; báo lỗi khi không lưu được.
- Kiểm thử trình duyệt giả lập phát audio để tránh tiếng động; không thay cho nghe rà âm thanh, thử với trẻ hoặc thử trực tiếp trên điện thoại thật.
- Công cụ QA: `scripts/check-study-browser.mjs`, nhận đường dẫn file URL tới module Playwright cài ngoài dự án; không thêm Playwright vào dependencies.

Chưa commit/push. Phần tạo và nghe duyệt 7 lời hướng dẫn đã hoàn tất; các giới hạn kiểm thử trực tiếp với trẻ và điện thoại thật nêu trên vẫn giữ nguyên.
