import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from "firebase/analytics"; 
// 1. Thêm getAuth vào import
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "vibeplate-1680f.firebaseapp.com",
  projectId: "vibeplate-1680f",
  storageBucket: "vibeplate-1680f.firebasestorage.app",
  messagingSenderId: "713850148752",
  appId: "1:713850148752:web:09c8f0c6e2367d57b10515",
  measurementId: "G-3TNJWE2HJC"
};

const app = initializeApp(firebaseConfig);

let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.log("Analytics not supported:", err.message);
});

const db = getFirestore(app);

// 2. Sửa đoạn khởi tạo Auth để tránh lỗi "already-initialized"
let auth;
try {
  // Cố gắng khởi tạo mới với Persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  // Nếu đã khởi tạo rồi (lỗi already-initialized), thì lấy instance cũ
  auth = getAuth(app);
}

export { db, auth, analytics };