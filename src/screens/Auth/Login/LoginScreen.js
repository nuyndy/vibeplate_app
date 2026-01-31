import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, RefreshControl 
} from 'react-native';
import styles from './styles'; 

// --- FIREBASE & GOOGLE IMPORTS ---
import { auth, db } from '../../../firebase/firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential, 
  signInWithPopup,
  signOut,
  sendEmailVerification,
  deleteUser,
  reload 
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '713850148752-4ebjj3mt0kctk2ishpu166mno66e2b18.apps.googleusercontent.com', 
      offlineAccess: true,
    });
  }, []);

  // --- HÀM TẠO DỮ LIỆU USER ---
  const checkAndCreateUserData = async (user) => {
    try {
      const userDocId = user.email.toLowerCase(); 
      const userRef = doc(db, "users", userDocId);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {          
          email: user.email,
          displayName: user.displayName || "Thành viên mới",
          photo_url: user.photoURL || "https://i.pinimg.com/736x/93/0b/21/930b2170b904835c0331d82f0b4f7951.jpg",
          isVerified: true,  
          location: "",      
          role: "user", 
          createdAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Lỗi Firestore:", error);
    }
  };

  // --- HÀM RELOAD TRẠNG THÁI XÁC THỰC ---
  const onRefresh = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    try {
      await reload(user); 
      if (user.emailVerified) {
        await checkAndCreateUserData(user);
        Alert.alert(
          "Tuyệt vời!", 
          "Email của bạn đã được xác thực thành công. Chào mừng bạn đến với VibePlate!",
          [{ text: "Khám phá ngay" }]
        );
      } else {
        Alert.alert(
          "Thông báo", 
          "Chúng mình vẫn chưa nhận được xác nhận. Bạn hãy kiểm tra kỹ hộp thư (bao gồm cả thư rác) nhé!"
        );
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể làm mới trạng thái. Vui lòng thử lại sau.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // --- HÀM ĐĂNG NHẬP ---
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Nhắc nhở', 'Bạn vui lòng nhập đầy đủ Email và Mật khẩu nhé!');
      return;
    }
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const isAdmin = user.email.toLowerCase() === "admin@vibeplate.com";

      if (!isAdmin) {
          await reload(user); 

          if (!user.emailVerified) {
              const creationTime = new Date(user.metadata.creationTime).getTime();
              const now = Date.now();
              const oneDayMs = 24 * 60 * 60 * 1000;

              if (now - creationTime > oneDayMs) {
                  try {
                      await deleteUser(user);
                      Alert.alert(
                        "Tài khoản hết hạn", 
                        "Vì bạn chưa xác thực email trong vòng 24h qua, tài khoản này đã được gỡ bỏ để bảo mật. Bạn hãy đăng ký lại nhé!"
                      );
                  } catch (err) {
                      await signOut(auth);
                  }
                  setLoading(false);
                  return;
              }

              Alert.alert(
                  "Xác nhận Email", 
                  "Bạn cần xác thực email trước khi đăng nhập. \n\nSau khi bấm vào link trong thư, hãy quay lại đây và 'Vuốt xuống' để làm mới nhé!",
                  [
                      { 
                          text: "Gửi lại Email", 
                          onPress: () => {
                            sendEmailVerification(user);
                            Alert.alert("Đã gửi!", "Link xác nhận mới đã được gửi đi.");
                            signOut(auth);
                          }
                      },
                      { text: "Để sau", style: "cancel", onPress: () => signOut(auth) }
                  ]
              );
              setLoading(false);
              return;
          }
      }

      await checkAndCreateUserData(user);
      
    } catch (error) {
      console.log(error.code);
      let title = "Đăng nhập thất bại";
      let msg = "Đã có lỗi xảy ra, vui lòng thử lại sau.";

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        msg = "Email hoặc mật khẩu không chính xác. Bạn kiểm tra lại nhé!";
      } else if (error.code === 'auth/too-many-requests') {
        msg = "Bạn đã nhập sai quá nhiều lần. Vui lòng đợi một lát rồi thử lại.";
      } else if (error.code === 'auth/invalid-email') {
        msg = "Định dạng email không hợp lệ.";
      }

      Alert.alert(title, msg);
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM ĐĂNG NHẬP GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await checkAndCreateUserData(result.user);
      } else {
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signOut().catch(() => {});
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo.data?.idToken || userInfo.idToken; 
        const googleCredential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, googleCredential);
        await checkAndCreateUserData(userCredential.user);
      }
    } catch (error) {
      if (error.code !== 'RNGoogleSignin:SIGN_IN_CANCELLED') {
        Alert.alert("Thông báo", "Vui lòng chọn tài khoản Google để tiếp tục đăng nhập.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{flex: 1, backgroundColor: '#fff'}}
    >
      <ScrollView 
        contentContainerStyle={[styles.container, {flexGrow: 1, justifyContent: 'center'}]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            title="Đang kiểm tra trạng thái xác thực..."
            tintColor="#000"
          />
        }
      >
        <Text style={styles.title}>VibePlate</Text>
        <Text style={styles.subtitle}>Chào mừng bạn quay trở lại!</Text>

        <TextInput
          style={styles.input}
          placeholder="Email của bạn"
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
          style={[styles.button, loading && { opacity: 0.8 }]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>}
        </TouchableOpacity>

        <View style={{flexDirection: 'row', alignItems: 'center', marginVertical: 20}}>
          <View style={{flex: 1, height: 1, backgroundColor: '#eee'}} />
          <Text style={{marginHorizontal: 10, color: '#999', fontSize: 12}}>HOẶC</Text>
          <View style={{flex: 1, height: 1, backgroundColor: '#eee'}} />
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.googleButton]} 
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Tiếp tục với Google</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkContainer} 
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={{color: '#666'}}>
            Mới biết đến VibePlate? <Text style={styles.linkText}>Đăng ký ngay</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}