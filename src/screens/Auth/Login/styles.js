import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  // Khung bao ngoài toàn màn hình
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Nền trắng sạch sẽ
    paddingHorizontal: 30,      // Cách lề 2 bên
    justifyContent: 'center',   // Căn giữa theo chiều dọc
  },

  // Tiêu đề lớn (VibePlate / Tạo tài khoản)
  title: {
    fontSize: 32,
    fontWeight: '800', // Chữ đậm
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },

  // Dòng chữ nhỏ bên dưới tiêu đề
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 40, // Cách xa phần nhập liệu một chút
    textAlign: 'center',
  },

  // Ô nhập liệu (Input)
  input: {
    height: 55,
    backgroundColor: '#F5F5F5', // Màu xám nhẹ
    borderRadius: 12,           // Bo tròn góc
    paddingHorizontal: 20,
    marginBottom: 16,           // Khoảng cách giữa các ô
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: 'transparent', // Bình thường không viền
  },

  // Nút bấm chính (Đăng nhập / Đăng ký)
  button: {
    backgroundColor: '#FF6B6B', // Màu cam san hô chủ đạo (Rất hợp app nấu ăn)
    height: 56,
    borderRadius: 16,           // Bo góc mềm mại
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    // Đổ bóng nhẹ cho nút nổi lên
    shadowColor: "#FF6B6B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  // Chữ trong nút bấm
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5, // Giãn chữ ra xíu cho sang
  },

  // Nút Google (Kế thừa style của nút chính nhưng đổi màu)
  googleButton: {
    backgroundColor: '#DB4437', // Màu đỏ chuẩn Google
    marginTop: 15,
    shadowColor: "#DB4437",
    flexDirection: 'row', // Để icon (nếu có) và chữ nằm ngang
  },

  // Vùng chứa link chuyển trang (Chưa có tài khoản? ...)
  linkContainer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chữ nhấn được (Đăng ký ngay / Đăng nhập)
  linkText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default styles;