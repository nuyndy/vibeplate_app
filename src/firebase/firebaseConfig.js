// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
// SỬA Ở ĐÂY: Thêm isSupported vào dòng import
import { getAnalytics, isSupported } from "firebase/analytics"; 
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAI8Nsv8yv6oJ0HzFw4CipU0ol8U8ErcAU",
  authDomain: "vibeplate-1680f.firebaseapp.com",
  projectId: "vibeplate-1680f",
  storageBucket: "vibeplate-1680f.firebasestorage.app",
  messagingSenderId: "713850148752",
  appId: "1:713850148752:web:09c8f0c6e2367d57b10515",
  measurementId: "G-3TNJWE2HJC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Xử lý Analytics an toàn (Tránh lỗi trên Mobile)
let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  // Bỏ qua lỗi nếu không hỗ trợ
  console.log("Analytics not supported:", err.message);
});

const db = getFirestore(app);

// Cấu hình Auth với AsyncStorage (Để nhớ đăng nhập)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { db, auth, analytics };