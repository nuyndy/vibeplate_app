// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };