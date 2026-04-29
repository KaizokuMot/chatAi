import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STROGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_measurementId
};


// Initialize Firebase
console.log("Firebase: Initializing app...");
let auth: any;
let db: any;

try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase: Initialized successfully.");
} catch (error) {
  console.error("Firebase: Initialization failed (check API key):", error);
  // Provide robust mock objects so the app doesn't crash
  auth = { 
    onAuthStateChanged: (cb: any) => { 
      // Trigger callback with null user immediately
      setTimeout(() => cb(null), 0);
      return () => {}; 
    }, 
    signOut: () => Promise.resolve(),
    currentUser: null
  };
  db = {
    type: 'mock'
  }; 
}

export { auth, db };



