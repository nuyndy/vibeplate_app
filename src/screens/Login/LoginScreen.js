import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform
} from "react-native";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // 1. KIỂM TRA TÀI KHOẢN ADMIN MẶC ĐỊNH
    if (email.trim() === "admin@vibeplate.com" && password === "123456a@") {
      Alert.alert("Xin chào Admin!", "Đang vào hệ thống...", [
        { text: "OK", onPress: () => navigation.replace("DrawerStack") }
      ]);
      return;
    }

    // 2. LOGIC CHO NGƯỜI DÙNG KHÁC (Sau này thêm database vào đây)
    Alert.alert(
      "Đăng nhập thất bại",
      "Sai email hoặc mật khẩu!\nNếu bạn là Admin, hãy kiểm tra kỹ từng ký tự."
    );
  };

  // --- ĐÂY LÀ PHẦN QUAN TRỌNG ĐÃ SỬA ---
  const handleRegister = () => {
    // Chuyển hướng sang màn hình "Signup" đã khai báo bên AppNavigation
    navigation.navigate("Signup");
  };
  // -------------------------------------

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/2921/2921822.png" }}
          style={styles.logo}
        />
        <Text style={styles.appName}>VibePlate</Text>
        <Text style={styles.slogan}>Quản lý bếp thông minh</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập email..."
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu..."
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Đăng Nhập</Text>
        </TouchableOpacity>

        {/* Nút Đăng ký */}
        <TouchableOpacity onPress={handleRegister} style={styles.registerLink}>
          <Text style={styles.registerText}>
            Chưa có tài khoản? <Text style={styles.registerHighlight}>Đăng ký ngay</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  logoContainer: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2cd18a",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    elevation: 5,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
    tintColor: "white",
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
  },
  slogan: {
    color: "#e0f7fa",
    fontSize: 14,
  },
  inputContainer: {
    flex: 2,
    padding: 25,
    paddingTop: 30,
  },
  label: {
    color: "#333",
    fontWeight: "bold",
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#2cd18a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
  registerLink: {
    marginTop: 25,
    alignItems: "center",
  },
  registerText: {
    color: "#666",
    fontSize: 15,
  },
  registerHighlight: {
    color: "#2cd18a",
    fontWeight: "bold",
  },
});
