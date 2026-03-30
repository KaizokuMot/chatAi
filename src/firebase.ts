import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase config from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAZpLNyS9RN7BN6eAcD5AvHmgKBi-eYfmA",
  authDomain: "moxiescreen.firebaseapp.com",
  databaseURL: "https://moxiescreen-default-rtdb.firebaseio.com",
  projectId: "moxiescreen",
  storageBucket: "moxiescreen.appspot.com",
  messagingSenderId: "346104076821",
  appId: "1:346104076821:web:b9e28de331612ead48cc1c",
  measurementId: "G-H0W642QTFT" 
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);



