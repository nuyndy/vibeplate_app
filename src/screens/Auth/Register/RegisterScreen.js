import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

// Import config
import { auth, db } from '../../../firebase/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; 

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Validate đầu vào
    if (fullName.trim() === '' || email.trim() === '' || password.trim() === '') {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ Họ tên, Email, Mật khẩu');
      return;
    }

    setLoading(true); 

    try {
      // 2. Tạo User trên Firebase Authentication (để đăng nhập)
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Cập nhật tên hiển thị vào profile của Auth
      await updateProfile(user, { displayName: fullName });

      // 3. Lưu thông tin vào Firestore (Database)
      // Dùng user.uid làm Document ID (để dễ dàng tìm user theo ID sau này)
      const userRef = doc(db, "users", user.uid);

      // Tạo object dữ liệu khớp chính xác với yêu cầu của bạn
      const userData = {
        uid: user.uid,                              // String
        email: user.email,                          // String
        displayName: fullName,                      // String
        photo_url: "https://i.pravatar.cc/300",     // String (Lấy ảnh mặc định)
        role: "user",                               // String
        createdAt: serverTimestamp(),               // Timestamp (Lấy giờ server)
      };

      // Ghi dữ liệu
      await setDoc(userRef, userData);

      Alert.alert('Thành công', 'Tạo tài khoản thành công!');
      navigation.navigate('Login');

    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Email này đã được sử dụng!";
      if (error.code === 'auth/weak-password') msg = "Mật khẩu phải có ít nhất 6 ký tự!";
      if (error.code === 'auth/invalid-email') msg = "Địa chỉ Email không hợp lệ!";
      
      Alert.alert('Đăng ký thất bại', msg);
    } finally {
      setLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <Text style={styles.title}>Tạo Tài Khoản</Text>
      <Text style={styles.subtitle}>Tham gia cộng đồng VibePlate</Text>

      <TextInput
        style={styles.input}
        placeholder="Họ và tên hiển thị"
        value={fullName}
        onChangeText={setFullName}
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor="#aaa"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>ĐĂNG KÝ NGAY</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkContainer} 
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={{color: '#666'}}>
          Đã có tài khoản? <Text style={styles.linkText}>Đăng nhập</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}