import { StyleSheet, Platform } from "react-native";

const styles = StyleSheet.create({
  btnContainer: {
    // 1. Tạo hình tròn
    width: 45,  
    height: 45,
    borderRadius: 25,
    
    // 2. Căn giữa icon bên trong
    alignItems: "center",
    justifyContent: "center",
    
    // 3. Khoảng cách an toàn
    margin: 10,
    backgroundColor: "white",

    // 4. Đổ bóng mềm mại
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.15,
        shadowRadius: 8,   
      },
      android: {
        elevation: 6, // Độ nổi cao hơn để tách biệt khỏi nền
      },
    }),
  },
  
  btnIcon: {
    height: 20, 
    width: 20,
    resizeMode: 'contain', // Đảm bảo icon không bị méo
    tintColor: '#333333',  // (Tuỳ chọn) Đổi màu icon sang xám đậm cho tinh tế
  },
});

export default styles;