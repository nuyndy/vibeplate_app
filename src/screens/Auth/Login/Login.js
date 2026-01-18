import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import styles from './styles'; 

// --- FIREBASE & GOOGLE IMPORTS ---
import { auth, db } from '../../../../firebase/firebaseConfig';
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
    });
  }, []);

  // --- HÀM 1: ĐĂNG NHẬP THƯỜNG ---
  const handleLogin = async () => {
    if (email === '' || password === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Đăng nhập thường thành công");
      // App tự chuyển trang nhờ AuthListener bên ngoài
    } catch (error) {
      Alert.alert('Lỗi đăng nhập', error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM 2: XỬ LÝ DỮ LIỆU USER SAU KHI LOGIN ---
  // Hàm này dùng chung để tạo dữ liệu nếu user chưa tồn tại
  const checkAndCreateUserData = async (user) => {
    try {
      // 1. Xác định ID là Email
      const userDocId = user.email.toLowerCase();
      const userRef = doc(db, "users", userDocId);
      
      // 2. Kiểm tra xem user đã có trong Firestore chưa
      const docSnap = await getDoc(userRef);

      // 3. Nếu CHƯA CÓ -> Tạo mới (Giống hệt logic bên Register)
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          id: userDocId,
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || "User Google",
          photoURL: user.photoURL || "https://i.pravatar.cc/300",
          
          // Khởi tạo khung dữ liệu rỗng (để update sau)
          myFridge: [],
          favorites: [],
          preferences: {
            dietType: "none",
            allergies: [],
            cookingSkill: "beginner"
          },
          createdAt: Timestamp.now(),
        });
        console.log("Đã khởi tạo dữ liệu cho User Google mới!");
      } else {
        console.log("User cũ đã có dữ liệu, không cần tạo lại.");
      }
    } catch (error) {
      console.error("Lỗi khi tạo user data:", error);
      Alert.alert("Lỗi dữ liệu", "Không thể khởi tạo thông tin người dùng.");
    }
  };

  // --- HÀM 3: ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      let userCredential;

      // 👉 TRƯỜNG HỢP 1: CHẠY TRÊN WEB
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        // Mở cửa sổ Popup đăng nhập Google của trình duyệt
        userCredential = await signInWithPopup(auth, provider);
      } 
      
      // 👉 TRƯỜNG HỢP 2: CHẠY TRÊN MOBILE (Android/iOS)
      else {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data.idToken; 
        const googleCredential = GoogleAuthProvider.credential(idToken);
        userCredential = await signInWithCredential(auth, googleCredential);
      }

      const user = userCredential.user;

      // --- PHẦN DƯỚI NÀY GIỮ NGUYÊN (Lưu vào Firestore) ---
      const userDocId = user.email.toLowerCase();
      const userDocRef = doc(db, "users", userDocId);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          id: userDocId,
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || "Người dùng Google",
          photoURL: user.photoURL,
          myFridge: [],
          favorites: [],
          preferences: {
            dietType: "none",
            allergies: [],
            cookingSkill: "beginner"
          },
          createdAt: Timestamp.now(),
        });
      }

      Alert.alert("Chào mừng", `Xin chào ${user.displayName}!`);
      // navigation.navigate('Home'); // Nhớ mở dòng này khi có trang Home

    } catch (error) {
      console.log(error);
      Alert.alert("Lỗi đăng nhập", error.message);
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
        <Text style={styles.buttonText}>G  Tiếp tục với Google</Text>
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