import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

import { auth, db } from '../../../firebase/firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore'; 

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // 1. Validate cơ bản
    if (fullName.trim() === '' || email.trim() === '' || password.trim() === '') {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ Họ tên, Email, Mật khẩu');
      return;
    }

    setLoading(true); 

    try {
      // 2. Tạo User Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // Cập nhật tên hiển thị ngay vào Auth (để tiện dùng sau này)
      await updateProfile(user, { displayName: fullName });

      // 3. Tạo Document với ID là Email
      const userDocId = user.email.toLowerCase(); 

      // Dữ liệu khởi tạo (Chưa có sở thích, sẽ cập nhật ở màn hình khác sau)
      const userData = {
        id: userDocId,
        uid: user.uid,
        email: user.email,
        fullName: fullName,
        photoURL: "https://i.pravatar.cc/300", // Ảnh mặc định
        
        // --- KHỞI TẠO SẴN CÁC TRƯỜNG RỖNG CHO CHATBOT ---
        // Để tránh lỗi "undefined" khi Chatbot đọc dữ liệu sau này
        myFridge: [],        
        favorites: [],       
        preferences: {       
          dietType: "none",  // Mặc định không ăn kiêng
          allergies: [],     
          cookingSkill: "beginner" 
        },
        createdAt: Timestamp.now(), 
      };

      await setDoc(doc(db, "users", userDocId), userData);

      Alert.alert('Thành công', 'Tạo tài khoản thành công!');
      navigation.navigate('Login');

    } catch (error) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Email này đã được sử dụng!";
      if (error.code === 'auth/weak-password') msg = "Mật khẩu quá ngắn (tối thiểu 6 ký tự)!";
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
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>ĐĂNG KÝ NGAY</Text>}
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