import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

// --- IMPORTS FIREBASE & GOOGLE ---
import { auth, db } from '../../../firebase/firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'; 
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Cấu hình Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      // Web Client ID lấy từ Google Cloud Console
      webClientId: '713850148752-4ebjj3mt0kctk2ishpu166mno66e2b18.apps.googleusercontent.com', 
      offlineAccess: true,
    });
  }, []);

  // --- HÀM LƯU DỮ LIỆU VÀO FIRESTORE (Dùng chung) ---
  const saveUserToFirestore = async (user, nameOverride = null) => {
    try {
      // Dùng Email làm Document ID để thống nhất với Login/Account
      const userDocId = user.email.toLowerCase();
      const userRef = doc(db, "users", userDocId);
      
      // Kiểm tra xem đã có chưa (đề phòng Google Login user cũ)
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        const userData = {
          // 2. Email
          email: user.email,
          // 3. Tên hiển thị (Ưu tiên tên nhập tay nếu có)
          displayName: nameOverride || user.displayName || "Người dùng mới",
          // 4. Ảnh đại diện
          photo_url: user.photoURL || "https://i.pravatar.cc/300",
          // 5. Role mặc định
          role: "user",
          // 6. Thời gian tạo
          createdAt: serverTimestamp(), 
        };

        await setDoc(userRef, userData);
        console.log("--> Đã tạo User mới vào Firestore thành công!");
      }
    } catch (error) {
      console.error("Lỗi lưu Firestore:", error);
      throw error; // Ném lỗi ra để hàm cha xử lý
    }
  };

  // --- HÀM 1: ĐĂNG KÝ EMAIL/PASS ---
  const handleRegister = async () => {
    if (fullName.trim() === '' || email.trim() === '' || password.trim() === '') {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ Họ tên, Email, Mật khẩu');
      return;
    }

    setLoading(true); 

    try {
      // 1. Tạo User Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      // 2. Cập nhật Profile Auth
      await updateProfile(user, { displayName: fullName });

      // 3. Lưu vào Firestore (gọi hàm chung)
      await saveUserToFirestore(user, fullName);

      Alert.alert('Thành công', 'Tạo tài khoản thành công!');
      // Không cần navigate, AppNavigation tự chuyển
      
    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') msg = "Email này đã được sử dụng!";
      if (error.code === 'auth/weak-password') msg = "Mật khẩu quá yếu (cần > 6 ký tự)!";
      Alert.alert('Đăng ký thất bại', msg);
    } finally {
      setLoading(false); 
    }
  };

  // --- HÀM 2: ĐĂNG KÝ BẰNG GOOGLE ---
  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      // Web
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        // ... (xử lý tiếp)
      } 
      // Mobile
      else {
        await GoogleSignin.hasPlayServices();

        // --- 🔥 THÊM ĐOẠN NÀY ---
        try {
          await GoogleSignin.signOut();
        } catch (error) {
          // Không làm gì nếu chưa đăng nhập
        }
        // ------------------------

        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken || userInfo.idToken; 
        
        if (!idToken) throw new Error('Không tìm thấy Google ID Token');

        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        
        // Lưu vào Firestore
        await saveUserToFirestore(userCredential.user);

        Alert.alert("Chào mừng", `Đã đăng nhập với Google: ${userCredential.user.displayName}`);
      }
    } catch (error) {
      console.log(error);
      if (error.code !== 'RNGoogleSignin:SIGN_IN_CANCELLED') {
         Alert.alert("Lỗi Google", error.message);
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

      {/* Nút Đăng ký Email */}
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

      <Text style={{textAlign: 'center', marginVertical: 15, color: '#999'}}>HOẶC</Text>

      {/* Nút Đăng ký Google */}
      <TouchableOpacity 
        style={[styles.button, styles.googleButton]} 
        onPress={handleGoogleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>G   Đăng ký với Google</Text>
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