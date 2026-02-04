import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from "firebase/analytics"; 
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAI8Nsv8yv6oJ0HzFw4CipU0ol8U8ErcAU",
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
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export { db, auth, analytics };