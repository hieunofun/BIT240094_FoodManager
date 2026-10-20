# Kết quả kiểm tra — 20/10/2026

Đã chạy trên môi trường Windows của dự án:

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript (`npm run typecheck`) | Qua |
| ESLint (`npm run lint`) | Qua |
| Test dữ liệu và đồng bộ (`npm test`) | 13/13 qua |
| Kiểm tra cấu hình Expo (`npx expo-doctor`) | 20/20 qua |
| Xuất bản web (`npm run export:web`) | Qua |
| Xuất JavaScript/Hermes cho Android (`npm run export:android`) | Qua |
| E2E trên Chrome (`npm run test:e2e`) | Qua, không có lỗi JavaScript trên trang |
| Kiểm tra bố cục 375–1920px, quét qua 55 kích thước | Không phát hiện vỡ bố cục hoặc tràn ngang |

E2E kiểm tra English mặc định, tìm kiếm, giữ bộ lọc, nhiều ảnh và đổi ảnh đại diện, khoảng giá sai, thêm/sửa/xóa món và xác nhận, chặn xóa loại đang sử dụng, chuyển Tiếng Việt và giữ lựa chọn khi tải lại. Luồng tắt mạng → tạo món → bật mạng đã tự gửi bản ghi qua HTTP, không tạo trùng khi thử lại.

Test E2E thông thường sử dụng **server fixture trên loopback**, tách khỏi project thật để không làm thay đổi dữ liệu của người dùng. Ngày 20/10/2026 đã kiểm tra bổ sung trên **MockAPI thật** do người dùng cấu hình: tạo 3 loại và 6 món mẫu; xác nhận schema, khóa quan hệ, danh sách ảnh và ID duy nhất; thử sửa giá offline qua giao diện trình duyệt rồi bật mạng để app tự cập nhật. Giá ban đầu đã được khôi phục, dữ liệu cuối còn đúng 3 loại/6 món. Chưa demo trên điện thoại hoặc emulator.

URL gốc đã lưu trong `.env` của workspace. App cũ đang lưu URL trống sẽ nhận cấu hình này ở lần mở lại nếu chưa có lựa chọn kết nối chủ động; lựa chọn kết nối/ngắt kết nối trong Settings được giữ nguyên.

Xuất gói Android thành công **không đồng nghĩa đã tạo hoặc cài APK**. Chưa chạy ứng dụng trong Android emulator/máy thật và chưa tạo hai video nộp bài. Cấu hình EAS và kịch bản video đã có trong `eas.json` và `docs/DEMO.md`.

Ảnh chụp và báo cáo máy đo nằm trong `artifacts/e2e/` và `artifacts/ui-probe/` của workspace; chúng được loại khỏi Git. Bản chụp sử dụng dữ liệu mẫu, giao diện sáng/flat và font Inter; không có chế độ tối. Màu/font được khai báo tập trung trong `src/theme.ts`.
