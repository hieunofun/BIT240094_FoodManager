# Thiết lập MockAPI cho BIT240094

Chỉ cần **một project**. Trong project tạo **hai resource**, mỗi resource có bộ endpoint GET/POST/PUT/DELETE riêng.

## 1. Tạo project và resource

1. Mở https://mockapi.io, đăng nhập và tạo project `BIT240094_FoodManager`.
2. Tạo resource **`BIT240094_DishCategory`**.
3. Tạo resource **`BIT240094_Dish`**.
4. Không tạo quan hệ nested URL trong dashboard; app dùng hai endpoint phẳng và tự bảo đảm quan hệ bằng `BIT240094_DishCategoryId`.
5. Để cả hai resource **0 bản ghi**. Không bấm sinh dữ liệu Faker ngẫu nhiên. App sẽ gửi dữ liệu mẫu đúng cấu trúc.

Giữ `id` mặc định của MockAPI để dịch vụ định tuyến bản ghi. Đây là ID kỹ thuật của API. App dùng UUID riêng trong `BIT240094_Id`, lưu `id` kỹ thuật thành `BIT240094_RemoteId` ở local. Không dùng `id` server làm khóa quan hệ loại–món.

Đề yêu cầu tiền tố cho tên bảng/trường. Các resource và mọi trường do ứng dụng định nghĩa đều có tiền tố; `id` do dịch vụ tự sinh là ngoại lệ kỹ thuật cần chỉ rõ khi thuyết minh và đối chiếu với cách giảng viên áp dụng quy định.

## 2. Các trường DishCategory

| Tên trường              | Kiểu JSON |
| ----------------------- | --------- |
| `BIT240094_Id`          | String    |
| `BIT240094_Name`        | String    |
| `BIT240094_Description` | String    |
| `BIT240094_UpdatedAt`   | String    |
| `BIT240094_Revision`    | Number    |
| `BIT240094_IsDeleted`   | Boolean   |

## 3. Các trường Dish

| Tên trường                  | Kiểu JSON |
| --------------------------- | --------- |
| `BIT240094_Id`              | String    |
| `BIT240094_Name`            | String    |
| `BIT240094_Price`           | Number    |
| `BIT240094_PreparationTime` | Number    |
| `BIT240094_IsAvailable`     | Boolean   |
| `BIT240094_Description`     | String    |
| `BIT240094_DishCategoryId`  | String    |
| `BIT240094_DishImage`       | Array     |
| `BIT240094_UpdatedAt`       | String    |
| `BIT240094_Revision`        | Number    |
| `BIT240094_IsDeleted`       | Boolean   |

`BIT240094_DishImage` phải giữ **mảng JSON thật**, không phải chuỗi JSON. Mỗi phần tử:

```json
{
  "BIT240094_Id": "image-uuid",
  "BIT240094_ImageUrl": "https://example.com/photo.jpg",
  "BIT240094_IsThumbnail": true
}
```

Chọn kiểu Array/Object khi trình tạo schema hỗ trợ; không đặt generator ảnh ngẫu nhiên. Kiểm tra JSON trả về sau lần gửi đầu: trường ảnh là `[...]` và các phần tử có đủ tiền tố như trên. Các bản ghi do app tạo mang payload đầy đủ; không cần tự nhập các UUID hay tạo ảnh trên dịch vụ.

## 4. Nhập URL vào app

Ví dụ URL gốc (chỉ minh họa):

```text
https://YOUR_PROJECT.mockapi.io/api/v1
```

App tự ghép thành:

```text
https://YOUR_PROJECT.mockapi.io/api/v1/BIT240094_DishCategory
https://YOUR_PROJECT.mockapi.io/api/v1/BIT240094_Dish
```

URL gốc phải khớp chính xác prefix API bạn thiết lập trong MockAPI; nếu project không có `/api/v1` thì không tự thêm nó.

Mở app → Settings → Cloud connection → dán URL gốc → Save connection. Chờ trạng thái Up to date/Đã đồng bộ; kiểm tra dashboard thấy 3 loại và 6 món. App không cần nút đồng bộ thủ công.

## 5. Kiểm tra offline

1. Đồng bộ thành công ít nhất một lần.
2. Tắt toàn bộ kết nối Internet trên thiết bị.
3. Tạo hoặc sửa món rồi lưu; app báo đã lưu local.
4. Nếu dùng bản cài độc lập, có thể đóng/mở app để kiểm tra dữ liệu vẫn còn.
5. Bật Internet, giữ app mở. App tự gửi thay đổi.
6. Mở resource Dish trong dashboard kiểm tra đúng bản ghi và không có bản trùng.

Không có URL MockAPI thật thì chỉ xác minh được lưu local và luồng đồng bộ bằng server kiểm thử; cần hoàn tất các bước trên trước khi quay Video 1.

Nguồn chính thức: https://github.com/mockapi-io/docs/wiki/Quick-start-guide
