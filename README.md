# English Garden

Trang học tiếng Anh cho trẻ em với **22 từ thuộc 4 chủ đề**: Xung quanh bé, Con vật, Đồ ăn và Trường học. Bé có thể xem tranh, nghe từng từ, nghe chậm hai lần và chơi trò chọn đúng hình. Trang chạy hoàn toàn tĩnh: không cần đăng nhập, không lưu dữ liệu của trẻ và không cần máy chủ riêng.

## Điều bé có thể làm

- Chạm vào từng tranh ở “Góc từ vựng” để nghe từ tiếng Anh.
- Chơi nghe – chọn hình với đáp án được xáo vị trí ở mỗi lượt.
- Dùng nút **Nghe chậm** để từ được đọc hai lần, chậm hơn.
- Tích sao và huy hiệu theo chủ đề; tiến độ chỉ được lưu trong trình duyệt trên chính máy đó.

## Giọng đọc OpenAI

Trang hỗ trợ các tệp MP3 tạo trước bằng OpenAI `gpt-4o-mini-tts`, giọng `marin`. Mỗi từ có một bản nghe thường và một bản nghe chậm hai lần. Khi các tệp này chưa được tạo, trang mới dùng giọng tiếng Anh có sẵn của trình duyệt làm dự phòng.

Để tạo đủ tệp âm thanh, cần một OpenAI API key. Đây là khóa dành cho OpenAI API, tách biệt với việc đăng nhập hoặc đăng ký ChatGPT. Không dán khóa vào mã nguồn hay đưa khóa lên GitHub.

Trong thư mục dự án, chạy:

~~~bash
npm run audio:generate
~~~

Trước khi chạy, hãy sao chép riêng chuỗi khóa bắt đầu bằng `sk-`. Lệnh sẽ yêu cầu bạn nhấn Enter rồi tự đọc khóa từ clipboard, không hiển thị khóa trên màn hình. Sau đó lệnh tạo 44 tệp MP3 trong `public/audio/openai-coral`. Chạy lại trang sau khi hoàn tất. Trang sẽ tự chuyển sang **OpenAI · Coral** và hiển thị thông báo rằng đây là giọng AI.

Để tạo 4 từ nghe thử bằng `gpt-4o-mini-tts` với giọng **Cedar** và cách đọc tự nhiên hơn, chạy:

```powershell
npm run audio:sample-cedar
```

Các tệp mẫu được lưu riêng trong `public/audio/openai-cedar-sample`, không ghi đè bộ âm thanh đang dùng trên website.

Nếu giọng Cedar khó nhận biết, có thể tạo 4 từ mẫu ưu tiên nghe rõ bằng giọng **Coral**, với tốc độ được giảm nhẹ và phụ âm đầu/cuối rõ hơn:

```powershell
npm run audio:sample-clear
```

Các tệp này được lưu trong `public/audio/openai-coral-clear-sample`.

## Đưa trang lên GitHub Pages

1. Tạo một repository **public** trên GitHub, rồi đưa toàn bộ thư mục này lên nhánh `main`.
2. Vào **Settings → Pages → Source** và chọn **GitHub Actions**.
3. Mỗi lần đẩy thay đổi lên nhánh `main`, GitHub sẽ tự dựng và xuất bản trang. Vài phút sau, liên kết trang sẽ xuất hiện trong phần Pages hoặc ở lần chạy mới nhất trong tab Actions.

Tên repository có thể là bất kỳ tên nào. Cấu hình xuất bản đã tự điều chỉnh đường dẫn hình ảnh cho cả website dạng `tenban.github.io` và website nằm trong một repository riêng.

## Chạy trên máy

~~~bash
npm install
npm run dev
~~~

Sau đó mở địa chỉ hiện trong cửa sổ dòng lệnh, thường là `http://localhost:5173/`.
