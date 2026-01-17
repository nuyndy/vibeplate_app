🍳 Smart Kitchen Mate - Trợ Lý Bếp & Quản Lý Thực Phẩm Thông Minh
Ứng dụng "All-in-one" giúp bạn quản lý tủ lạnh, gợi ý món ăn theo sở thích cá nhân và kết nối cộng đồng yêu bếp. Xây dựng trên nền tảng React Native (Expo) và Firebase.

<center><img src="https://i.pinimg.com/736x/ae/a3/70/aea370de411a7ce2c4d20910bed150b6.jpg" alt="App Screenshot" width="400"/></center>

✨ Tính Năng Nổi Bật (Key Features)
1. 📦 Quản Lý Kho Thông Minh (Smart Inventory)
Của ai người nấy giữ: Hỗ trợ đa người dùng (Multi-user), mỗi người có kho riêng biệt.
Theo dõi hạn sử dụng: Phân loại thực phẩm theo màu sắc (Xanh - An toàn, Vàng - Sắp hết hạn, Đỏ - Hết hạn).
Tra cứu nhanh: Tìm kiếm thực phẩm trong tủ lạnh bằng từ khóa hoặc danh mục.

2. 🍲 Gợi Ý Món Ăn & Cá Nhân Hóa (AI & Personalization)
Gợi ý thông minh: Đề xuất món ăn dựa trên nguyên liệu đang có sẵn trong tủ lạnh (giảm lãng phí thực phẩm).
Bộ lọc "Gu" ăn uống: Tự động loại bỏ món chứa nguyên liệu dị ứng, ưu tiên khẩu vị (Chua/Cay/Mặn/Ngọt) và chế độ ăn (Vegan/Keto...) dựa trên hồ sơ user_preferences.
Chi tiết công thức: Hướng dẫn từng bước, định lượng nguyên liệu và thời gian nấu chuẩn xác.

3. 🛒 Tiện Ích Mở Rộng
Danh sách đi chợ (Shopping List): Lên danh sách đồ cần mua, hỗ trợ tích chọn khi đi siêu thị.
Cộng đồng (Community): Người dùng có thể tự đóng góp công thức món ăn mới (thông qua quy trình Admin duyệt).

🛠 Công Nghệ Sử Dụng (Tech Stack)
Frontend: React Native, Expo Framework.
Backend (BaaS): Firebase Firestore (Database), Firebase Authentication (Auth), Firebase Storage (Image).
Architecture: Cấu trúc dữ liệu NoSQL tối ưu cho khả năng mở rộng (Scalability).

📂 Kiến Trúc Dữ Liệu (Database Schema)
Hệ thống sử dụng 8 Collections trên Firestore để đảm bảo tính năng chuyên sâu:

🔹 Nhóm Dữ Liệu Người Dùng
users: Thông tin tài khoản, phân quyền (Admin/User).
inventory: Kho thực phẩm cá nhân (kèm expiryDate, quantity, userId).
user_preferences: Hồ sơ khẩu vị, dị ứng, kỹ năng nấu nướng (Core của thuật toán gợi ý).
shopping_list: Danh sách thực phẩm cần mua sắm.

🔹 Nhóm Dữ Liệu Hệ Thống
categories: Danh mục món ăn (Ăn sáng, Món chính, Tráng miệng...).
ingredients: Từ điển nguyên liệu chuẩn (dùng để chuẩn hóa dữ liệu).
recipes: Kho tàng công thức nấu ăn chính thức.

🔹 Nhóm Dữ Liệu Cộng Đồng
suggested_recipes: Các món ăn do người dùng đóng góp (Hàng chờ duyệt).

🚀 Hướng Phát Triển (Roadmap)
[ ] Tích hợp AI Vision (Quét ảnh thực phẩm để tự nhập kho).
[ ] Voice Control (Điều khiển rảnh tay khi nấu ăn).
[ ] Tính toán Calories và dinh dưỡng (Macro tracking).

Dựa trên Starter Kit của Instamobile, được tùy biến và nâng cấp kiến trúc Backend toàn diện.
