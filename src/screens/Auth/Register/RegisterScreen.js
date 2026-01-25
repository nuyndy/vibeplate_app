import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

// --- CHỈ CẦN IMPORT AUTH ---
// (Không cần Firestore hay Google ở đây nữa)
import { auth } from '../../../firebase/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification, 
  signOut 
} from 'firebase/auth';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- HÀM ĐĂNG KÝ EMAIL/PASS ---
  const handleRegister = async () => {
    // 1. Validate thông tin
    if (fullName.trim() === '' || email.trim() === '' || password.trim() === '') {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ Họ tên, Email, Mật khẩu');
      return;
    }

    setLoading(true); 

    try {
      // 2. Tạo tài khoản Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 3. Cập nhật tên hiển thị (quan trọng để sau này lưu vào Firestore)
      await updateProfile(user, { displayName: fullName });

      // 4. Gửi Email xác thực
      await sendEmailVerification(user);
      
      // 5. Đăng xuất ngay lập tức
      // (Bắt buộc người dùng phải qua màn hình Login để kiểm tra xác thực và tạo data)
      await signOut(auth);

      Alert.alert(
        "Đăng ký thành công!",
        "Một email xác thực đã được gửi đến hộp thư của bạn.\nVui lòng kích hoạt tài khoản trước khi đăng nhập.",
        [{ text: "Về Đăng nhập", onPress: () => navigation.navigate('Login') }]
      );
      
    } catch (error) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Email này đã được sử dụng!";
      if (error.code === 'auth/weak-password') msg = "Mật khẩu quá yếu (tối thiểu 6 ký tự).";
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
        {/* Tiêu đề App */}
        <Text style={styles.title}>VibePlate</Text>
        <Text style={styles.subtitle}>Tạo tài khoản mới</Text>
        
        {/* Các ô nhập liệu */}
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

        {/* Nút Đăng ký */}
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
           {loading ? (
             <ActivityIndicator color="#fff"/> 
           ) : (
             <Text style={styles.buttonText}>ĐĂNG KÝ</Text>
           )}
        </TouchableOpacity>
        
        {/* Link chuyển qua Đăng nhập */}
        <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={{color: '#666'}}>
                Đã có tài khoản? <Text style={styles.linkText}>Đăng nhập</Text>
            </Text>
        </TouchableOpacity>
     </KeyboardAvoidingView>
  );
}