import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_deXgPmMYDtz7CPwhznRjmUp8V1Yy40k",
  authDomain: "cff-login-9541e.firebaseapp.com",
  projectId: "cff-login-9541e",
  storageBucket: "cff-login-9541e.firebasestorage.app",
  messagingSenderId: "958301559622",
  appId: "1:958301559622:web:aa46ed7e82264f5f62a347",
  measurementId: "G-65ZV8ZY72R"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
