import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

// --- FIREBASE & GOOGLE IMPORTS ---
import { auth, db } from '../../../firebase/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithPopup 
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      // Thay bằng Web Client ID của bạn
      webClientId: '713850148752-4ebjj3mt0kctk2ishpu166mno66e2b18.apps.googleusercontent.com', 
      offlineAccess: true,
    });
  }, []);

  // --- HÀM TẠO DỮ LIỆU USER (CẤU TRÚC CHUẨN) ---
  const checkAndCreateUserData = async (user) => {
    try {
      // Vẫn dùng email làm Document ID để dễ tìm kiếm
      const userDocId = user.email.toLowerCase(); 
      const userRef = doc(db, "users", userDocId);
      const docSnap = await getDoc(userRef);

      // Chỉ tạo mới nếu chưa có dữ liệu
      if (!docSnap.exists()) {
        await setDoc(userRef, {          
          // 2. Email
          email: user.email,
          
          // 3. Tên hiển thị
          displayName: user.displayName || "Người dùng mới",
          
          // 4. Avatar (Lưu ý: field tên là photo_url)
          photo_url: user.photoURL || "https://i.pravatar.cc/300",
          
          // 5. Phân quyền (Mặc định là user)
          role: "user", 
          
          // 6. Ngày tạo
          createdAt: Timestamp.now(),
        });
        console.log("--> Đã tạo User mới thành công!");
      } else {
        console.log("--> User cũ đã có dữ liệu.");
      }
    } catch (error) {
      console.error("Lỗi khi tạo user data:", error);
      Alert.alert("Lỗi dữ liệu", "Không thể khởi tạo thông tin người dùng.");
    }
  };

  // --- HÀM 1: ĐĂNG NHẬP THƯỜNG ---
  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Kiểm tra data user thường (đề phòng trường hợp tạo acc nhưng chưa có data)
      await checkAndCreateUserData(userCredential.user);
      console.log("Đăng nhập thường thành công");
    } catch (error) {
      Alert.alert('Lỗi đăng nhập', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM 2: ĐĂNG NHẬP GOOGLE ---
  // --- HÀM 2: ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // A. CHẠY TRÊN WEB
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        // Thêm dòng này để Web cũng bắt chọn tài khoản
        provider.setCustomParameters({ prompt: 'select_account' }); 
        await signInWithPopup(auth, provider);
        // ... (phần xử lý user như cũ)
      } 
      
      // B. CHẠY TRÊN MOBILE (Android/iOS)
      else {
        await GoogleSignin.hasPlayServices();
        
        // --- 🔥 THÊM ĐOẠN NÀY ĐỂ LUÔN CHO CHỌN TÀI KHOẢN ---
        try {
          await GoogleSignin.signOut();
        } catch (error) {
          // Bỏ qua lỗi nếu chưa đăng nhập trước đó
        }
        // ----------------------------------------------------

        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken || userInfo.idToken; 
        
        if (!idToken) throw new Error('Không tìm thấy Google ID Token');

        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        
        // Gọi hàm tạo data rút gọn
        await checkAndCreateUserData(userCredential.user);
        
        Alert.alert("Chào mừng", `Xin chào ${userCredential.user.displayName}!`);
      }

    } catch (error) {
      console.log(error);
      if (error.code !== 'RNGoogleSignin:SIGN_IN_CANCELLED') {
        Alert.alert("Lỗi Google Login", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <Text style={styles.title}>VibePlate</Text>
      <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>}
      </TouchableOpacity>

      <Text style={{textAlign: 'center', marginVertical: 15, color: '#999'}}>HOẶC</Text>

      <TouchableOpacity 
        style={[styles.button, styles.googleButton]} 
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>G   Tiếp tục với Google</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.linkContainer} 
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={{color: '#666'}}>
          Chưa có tài khoản? <Text style={styles.linkText}>Đăng ký ngay</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}