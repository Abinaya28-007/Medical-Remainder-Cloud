// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgfZSFDzXtQOeLzxVAjQWstq5SEhZut1Q",
    authDomain: "medicine-remainder-1e60c.firebaseapp.com",
    projectId: "medicine-remainder-1e60c",
    storageBucket: "medicine-remainder-1e60c.firebasestorage.app",
    messagingSenderId: "738490986377",
    appId: "1:738490986377:web:f1be6fd8876a3d9430bb58"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);