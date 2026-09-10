# English Garden

Web tiếng Anh cho bé 3–5 tuổi: **41 chủ đề, 427 mục học riêng biệt**, 461 lượt từ trong các chủ đề. Các từ xuất hiện ở nhiều nhóm dùng chung tiến độ, hình và âm thanh.

## Học và chơi

- Chọn **Đổi chủ đề**, chọn một trong 7 nhóm rồi chọn bài học.
- Mỗi bài nghe–chọn có tối đa 10 câu khác nhau. Chỉ lựa chọn đúng ngay lần đầu mới được tính điểm; chọn sai vẫn được thử lại.
- Bảng điểm có màu, sao và lời động viên theo kết quả. Sao và từ đã nhớ được giữ khi mở rộng danh mục; huy hiệu tính lại theo thành viên chủ đề.
- Góc từ vựng có tối đa 8 thẻ mỗi trang.
- Bảng chữ cái gồm tên chữ và một âm cơ bản cho mỗi chữ. Âm chữ chưa nghe duyệt bị khóa và không dùng giọng máy thay thế.
- Tiến độ chỉ lưu trong trình duyệt đang dùng. Không có đăng nhập hoặc máy chủ thu thập thông tin trẻ.

## Chạy trên máy

```powershell
npm install
npm run dev
```

Mở địa chỉ được in ra, thường là http://localhost:5173/.

## Nội dung

Trạng thái hoàn thiện và kết quả kiểm tra: [docs/implementation-status.md](docs/implementation-status.md).

`src/catalogue.mjs` là nguồn dữ liệu dùng chung cho web, kiểm tra và tạo giọng. Danh mục cũ giữ trong `src/vocabulary-data.json` để bảo toàn 120 mã từ đã có. `src/illustrations.json` ánh xạ các hình mới tới ô trong ảnh minh họa 3×3.

Số lượng ít hơn ở các nhóm hẹp là có chủ ý: ưu tiên từ gần gũi. Tên rau/củ theo cách gọi trong bữa ăn gia đình, không theo phân loại thực vật học. Tên tháng và thứ là nội dung phụ huynh hướng dẫn; bé không cần biết đọc lịch trước.

## Tạo giọng Coral

Các tệp âm thanh được tạo trước bằng OpenAI `gpt-4o-mini-tts`, giọng `coral`. Khóa chỉ dùng trên máy tạo âm thanh, không đưa vào web hay GitHub.

```powershell
npm run audio:generate
```

Lệnh ưu tiên biến môi trường `OPENAI_API_KEY` của phiên hiện tại hoặc tài khoản Windows. Nếu chưa có, lệnh yêu cầu sao chép khóa rồi nhấn Enter để đọc clipboard, không hiện khóa. Tệp có sẵn được giữ lại; chạy lại sau lỗi để tạo tiếp. Có thể tạo một nhóm bằng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-openai-audio.ps1 -Theme fruits
```

Mỗi mục có bản thường và bản chậm hai lần trong `public/audio/openai-coral`. Bài chưa có MP3 dùng giọng máy và hiển thị rõ trạng thái dự phòng.

## Âm chữ: tạo và nghe duyệt

```powershell
npm run audio:phonics
```

Lệnh tạo 52 tệp ứng viên: `letter-a-sound.mp3`, `letter-a-sound-slow.mp3` ... Chưa tự bật chúng trên web.

Nghe **cả hai tệp của từng chữ**, kiểm tra đúng âm cơ bản, không thành tên chữ, không thêm âm “ờ”, không có lời dẫn. Tạo lại các tệp sai trước khi duyệt. Các âm cần chú ý: nguyên âm ngắn; C/K cùng /k/; G /g/; Q đi cùng U /kw/; X /ks/ ở cuối “box”; Y /j/. Đây không phải bộ đầy đủ mọi cách đọc.

Sau khi người kiểm tra đã nghe đạt:

```powershell
node scripts/approve-phonics.mjs letter-a --listened-to-both
```

Có thể liệt kê nhiều mã đã nghe trong cùng lệnh. Không duyệt hàng loạt các tệp chưa nghe. Khi tạo lại với `-Force -Phonics`, các âm được tạo lại phải được duyệt lại. Bài kiểm tra âm chữ chỉ mở khi đủ 26 chữ đã duyệt; các nút nghe riêng mở theo từng chữ.

## Kiểm tra trước khi xuất bản

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run content:check
```

`content:check` liệt kê hình thiếu, MP3 thiếu, manifest chưa đủ và âm chữ chưa duyệt; trả về lỗi nếu bộ nội dung chưa hoàn tất. `npm run audio:audit` chỉ đếm tệp cần tạo, không gọi API.

## GitHub Pages

Giữ workflow xuất bản hiện có. Trong GitHub: **Settings → Pages → Source → GitHub Actions**. Khi bộ nội dung đã kiểm tra đầy đủ và được đẩy lên `main`, workflow dựng web với đường dẫn phù hợp repository.

Website: https://lythanhngodev64.github.io/HocTiengAnh/

Âm thanh AI cần được người lớn nghe kiểm tra trước khi dùng để dạy phát âm. Nguồn hướng dẫn API: https://developers.openai.com/api/docs/guides/text-to-speech
