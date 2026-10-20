# BIT240094_FoodManager

Ứng dụng React Native + Expo + TypeScript cho đề kiểm tra giữa kỳ **Quản lý món ăn**. MSSV: **BIT240094**.

Lưu dữ liệu trên **MockAPI + AsyncStorage**, không dùng SQLite. Một project MockAPI chứa hai resource `BIT240094_DishCategory` và `BIT240094_Dish`.

## Lấy mã nguồn

```powershell
git clone https://github.com/hieunofun/BIT240094_FoodManager.git
cd BIT240094_FoodManager
npm ci
Copy-Item .env.example .env
```

Điền URL gốc project MockAPI của bạn vào `EXPO_PUBLIC_MOCKAPI_URL` trong `.env`, hoặc nhập tại Settings trong app. File `.env` không được đưa lên Git. Chưa cấu hình URL, ứng dụng vẫn chạy với dữ liệu local.

## Chạy ứng dụng

Yêu cầu Node.js 22.13 trở lên, npm và Expo Go tương thích SDK 58 (hoặc development build).

```powershell
npm install
npm start
```

Quét mã QR bằng Expo Go trên điện thoại cùng mạng. Máy có Android emulator có thể dùng `npm run android`. Chạy bản trình duyệt bằng `npm run web`.

Nếu Expo Go chưa hỗ trợ SDK đang dùng, tạo development build theo hướng dẫn Expo. Để quay demo tắt mạng rồi đóng/mở lại app, nên dùng bản APK độc lập, không phụ thuộc Metro.

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Lệnh build cần tài khoản Expo của bạn; project chưa được liên kết hay gửi lên EAS tự động.

## Kết nối MockAPI

Xem hướng dẫn từng trường tại [docs/MOCKAPI.md](docs/MOCKAPI.md).

1. Tạo **một project**, rồi **hai resource** với tên chính xác bên trên, không sinh dữ liệu ngẫu nhiên.
2. Chạy app → **Settings → Cloud connection** → nhập URL gốc project → **Save connection**.
3. App tự gửi 3 loại và 6 món mẫu, sau đó tự đồng bộ thay đổi. Không cần nút Đồng bộ.

Hoặc copy `.env.example` thành `.env`, điền `EXPO_PUBLIC_MOCKAPI_URL`, khởi động lại Metro. App đã chạy local trước khi điền `.env` sẽ tự nhận URL mới ở lần mở lại; dữ liệu offline được giữ nguyên. Lựa chọn đã lưu chủ động trong Settings (kể cả ngắt kết nối) được ưu tiên.

**Chưa nhập URL:** app lưu và thao tác dữ liệu local thật, nhưng chưa đồng bộ lên dịch vụ MockAPI thật. Trạng thái trên giao diện hiển thị rõ điều này.

## Chức năng

- Danh sách, chi tiết, thêm/sửa/xóa món với xác nhận; quản lý loại món.
- Tìm một phần tên; kết hợp loại, trạng thái, khoảng giá; sắp xếp giá tăng/giảm hoặc thời gian tăng; giữ bộ lọc khi điều hướng.
- Kiểm tra tên, giá, thời gian, quan hệ loại, tên trùng trong cùng loại; chặn xóa loại đang dùng kể cả món ngừng bán.
- Nhiều ảnh bằng URL, đổi ảnh đại diện, tối đa một đại diện; ảnh lỗi/trống có hình thay thế.
- Thời gian ≤15 phút là Quick/Nhanh, còn lại Regular/Thông thường.
- English mặc định; chuyển English/Tiếng Việt; dịch cả lỗi/validation và lưu lựa chọn.
- Lưu offline bền vững; tự đồng bộ khi có mạng, mở lại app, quay lại app và thử lại lỗi mạng mỗi 30 giây khi app đang mở.
- UUID nghiệp vụ riêng, đối chiếu trước khi tạo lại; cờ chờ gửi đi cùng dữ liệu trong một snapshot; giữ lần sửa mới khi đang gửi lần sửa cũ; lưu dấu xóa đến khi API xác nhận.

## Cấu trúc

```text
src/app/          Expo Router: danh sách, chi tiết, thêm/sửa, loại, cài đặt
src/components/   Giao diện dùng chung, form món, lọc, xác nhận/toast
src/contexts/     Kết nối UI với repository, ngôn ngữ và trạng thái bộ lọc
src/data/         Model lưu trữ, mã hóa tiền tố, dữ liệu mẫu, repository/offline sync
src/services/     REST adapter MockAPI
src/models/       DishCategory, Dish, DishImage và kiểu dữ liệu
src/i18n/         Hai bộ bản dịch English và Tiếng Việt
src/utils/        Validation, lọc và sắp xếp
tests/            Kiểm thử quan hệ, dữ liệu, lưu offline và đồng bộ
docs/             Hướng dẫn MockAPI và kịch bản video
```

`src/config.ts` khai báo MSSV/tên resource. `src/data/codec.ts` đảm bảo **mọi trường JSON do ứng dụng quản lý** đều có tiền tố `BIT240094_`, kể cả ảnh lồng nhau, cài đặt và metadata đồng bộ. `id` mặc định của MockAPI là ID kỹ thuật của dịch vụ, được ánh xạ riêng với `BIT240094_Id` do ứng dụng tạo.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run export:web
npm run test:e2e
npm run export:android
```

E2E dùng Chromium qua Playwright và một server giả lập REST **chỉ để kiểm thử**, chạy trên loopback. Nó không thay thế tài khoản hoặc URL MockAPI thật. Nếu thiếu trình duyệt, chạy `npx playwright install chromium`.

`npm run mockapi:seed` xuất JSON dữ liệu mẫu có tiền tố vào `docs/mockapi/` để kiểm tra hoặc nhập thủ công. Thông thường chỉ cần để app tự đồng bộ lên resource rỗng.

## Phạm vi đồng bộ

Đồng bộ hoạt động khi app đang mở và tiếp tục khi mở lại app. Không hứa chạy nền sau khi hệ điều hành đóng ứng dụng. Dữ liệu tên/mô tả do người dùng nhập không bị dịch. Ảnh tải từ URL; khi offline, ảnh chưa có trong cache có thể hiện hình thay thế.

Ứng dụng phù hợp demo một người/một thiết bị. Khi cùng sửa một bản ghi trên nhiều thiết bị, thay đổi local đang chờ gửi được ưu tiên. MockAPI không cung cấp ràng buộc UUID duy nhất ở server, nên không thể bảo đảm chống đua tạo mới từ nhiều thiết bị cùng lúc; luồng một thiết bị có hàng đợi tuần tự và đối chiếu UUID khi thử lại.

Giao diện sáng, flat; màu và font tập trung trong `src/theme.ts`. Món ăn và ảnh Unsplash ban đầu là dữ liệu mẫu. Kịch bản nộp bài nằm trong [docs/DEMO.md](docs/DEMO.md).
