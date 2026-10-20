# Kịch bản demo và thuyết minh — BIT240094

## Video 1: nộp cùng link Git trong ca kiểm tra

Quay trực tiếp ứng dụng trên điện thoại hoặc Android emulator, dùng bản cài độc lập để demo mất mạng thuận tiện.

1. Mở Settings cho thấy **BIT240094** và **BIT240094_FoodManager**. Xác minh đang kết nối MockAPI thật.
2. Hiện danh sách mặc định English: 3 loại và ít nhất 5 món. Món ngừng bán vẫn có trong danh sách.
3. Mở chi tiết Basil pesto pasta: hai ảnh. Chọn ảnh thứ hai và đặt làm ảnh đại diện.
4. Thêm món mới: chọn loại từ dữ liệu đã lưu, giá, thời gian và nhiều URL ảnh. Lưu và xem chi tiết.
5. Sửa tên/giá/thời gian/trạng thái. Thử mốc 15 phút và 16 phút để thấy Quick/Regular.
6. Nhập sai: tên rỗng, giá 0, thời gian 0; thử trùng tên trong cùng loại. Sau đó nhập đúng và lưu.
7. Tìm một phần tên; phối hợp loại + đang bán + khoảng giá; đổi sắp xếp. Mở chi tiết rồi quay lại để thấy bộ lọc được giữ.
8. Nhập khoảng giá tối thiểu lớn hơn tối đa để thấy lỗi. Xóa lọc.
9. Qua Categories, thử xóa loại đang có món (kể cả món ngừng bán) để thấy bị chặn. Thêm một loại trống rồi xóa để minh họa xác nhận.
10. Xóa món vừa tạo, có xác nhận.
11. Đổi sang Tiếng Việt, mở danh sách/thêm/sửa/chi tiết; minh họa lỗi validation đã được dịch.
12. Tắt Internet → tạo/sửa món → lưu. Bật Internet, không bấm đồng bộ; quan sát trạng thái và kiểm tra bản ghi trên MockAPI. Đợi qua một lần thử lại nếu dịch vụ có độ trễ.

Chuẩn bị URL ảnh thật hoạt động trước khi quay. Không dùng server fixture của E2E làm minh chứng MockAPI thật.

## Video 2: hạn 23/10/2026

Thuyết minh theo luồng dưới đây, mở đúng file và giải thích bằng lời của mình:

1. `app.json`, `package.json`, `src/config.ts`: tên project, MSSV, tên resource.
2. `src/models/types.ts`: DishCategory, Dish, danh sách DishImage, khóa quan hệ DishCategoryId.
3. `src/data/codec.ts`: chuyển tên model nội bộ thành tất cả field có tiền tố `BIT240094_`; minh họa cả ảnh lồng nhau và metadata.
4. `src/data/seed.ts`: 3 loại, 6 món, ảnh mẫu và dữ liệu phủ các ca thời gian/trạng thái.
5. `src/data/repository.ts`: luồng đọc/lưu AsyncStorage, validate trước ghi, thao tác xóa và bảo vệ quan hệ.
6. `src/utils/validation.ts`: kiểm tra giá/thời gian/tên trùng; phối hợp điều kiện lọc và sắp xếp.
7. `src/components/DishForm.tsx`, `src/app/dishes/[id]/index.tsx`: thêm/sửa món, nhập URL ảnh và đặt ảnh đại diện.
8. `src/i18n/translations.ts`, `src/contexts/AppContext.tsx`: English mặc định, hai bộ từ điển, giữ ngôn ngữ và bộ lọc.
9. `src/services/api.ts`: GET/POST/PUT/DELETE, xử lý lỗi, phân biệt UUID nghiệp vụ với `id` kỹ thuật của MockAPI.
10. `src/data/repository.ts`: cờ dirty và dấu xóa lưu bền vững; đồng bộ loại trước món; xóa món trước loại; đối chiếu UUID trước POST; revision bảo vệ lần sửa mới.
11. `src/contexts/AppContext.tsx`: phát hiện mạng, tự đồng bộ khi mở/quay lại app, thử lại mỗi 30 giây khi đang mở.
12. Chạy test và minh họa một tình huống offline thật. Giải thích giới hạn: không có đồng bộ nền sau khi hệ điều hành đóng app, ảnh URL cần mạng nếu chưa được cache.

Mỗi chức năng phải hiểu và giải thích được. Giảng viên có thể yêu cầu sửa code trực tiếp.
