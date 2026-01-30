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
  signInWithPopup,
  signOut,               // Import thêm
  sendEmailVerification, // Import thêm
  deleteUser             // Import thêm
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
      const userDocId = user.email.toLowerCase(); 
      const userRef = doc(db, "users", userDocId);
      const docSnap = await getDoc(userRef);

      // Chỉ tạo mới nếu chưa có dữ liệu
      if (!docSnap.exists()) {
        await setDoc(userRef, {          
          email: user.email,
          displayName: user.displayName || "Người dùng mới",
          photo_url: user.photoURL || "https://i.pravatar.cc/300",
          
          // --- Thêm các trường mới theo yêu cầu ---
          isVerified: true,  
          location: "",      
          
          role: "user", 
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

  // --- HÀM 1: ĐĂNG NHẬP THƯỜNG (CÓ CHECK EMAIL) ---
  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 🔥 1. KIỂM TRA NGOẠI LỆ CHO ADMIN
      const isAdmin = user.email.toLowerCase() === "admin@vibeplate.com";

      // 🔥 2. NẾU KHÔNG PHẢI ADMIN -> BẮT BUỘC CHECK XÁC THỰC
      if (!isAdmin) {
          if (!user.emailVerified) {
              const creationTime = new Date(user.metadata.creationTime).getTime();
              const now = Date.now();
              const oneDayMs = 24 * 60 * 60 * 1000; // 24 giờ

              // A. Nếu quá 24h -> XÓA LUÔN
              if (now - creationTime > oneDayMs) {
                  try {
                      await deleteUser(user);
                      Alert.alert("Hết hạn", "Tài khoản tạo quá 24h chưa xác thực đã bị xóa. Vui lòng đăng ký lại.");
                  } catch (err) {
                      await signOut(auth); // Lỗi xóa thì cứ logout ra
                  }
                  setLoading(false);
                  return; // ⛔️ DỪNG LẠI
              }

              // B. Nếu chưa quá 24h -> NHẮC NHỞ
              Alert.alert(
                  "Chưa xác thực", 
                  "Vui lòng kiểm tra email để kích hoạt tài khoản.",
                  [
                      { 
                          text: "Gửi lại Email", 
                          onPress: () => sendEmailVerification(user).then(() => signOut(auth)) 
                      },
                      { text: "Đóng", onPress: () => signOut(auth) }
                  ]
              );
              setLoading(false);
              return; // ⛔️ DỪNG LẠI
          }
      }

      // 🔥 3. NẾU ĐÃ XÁC THỰC (HOẶC LÀ ADMIN) -> TẠO DATA VÀ CHO VÀO
      await checkAndCreateUserData(user);
      console.log("Đăng nhập thường thành công");
      
    } catch (error) {
      let msg = error.message;
      if(error.code === 'auth/invalid-credential') msg = "Sai email hoặc mật khẩu!";
      Alert.alert('Lỗi đăng nhập', msg);
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM 2: ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // A. CHẠY TRÊN WEB
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' }); 
        const result = await signInWithPopup(auth, provider);
        await checkAndCreateUserData(result.user); // Web cũng phải tạo data
      } 
      
      // B. CHẠY TRÊN MOBILE (Android/iOS)
      else {
        await GoogleSignin.hasPlayServices();
        
        try {
          await GoogleSignin.signOut();
        } catch (error) {
          // Bỏ qua lỗi nếu chưa đăng nhập trước đó
        }

        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken || userInfo.idToken; 
        
        if (!idToken) throw new Error('Không tìm thấy Google ID Token');

        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        
        // Gọi hàm tạo data rút gọn
        await checkAndCreateUserData(userCredential.user);
        
        console.log("Đăng nhập Google thành công");
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
        <Text style={styles.buttonText}>G    Tiếp tục với Google</Text>
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