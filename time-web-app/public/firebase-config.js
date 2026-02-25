import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCM7JlizTtYi1EhPDYZk27BMnSn6Cu7Qr8",
  authDomain: "class-test02182026.firebaseapp.com",
  databaseURL: "https://class-test02182026-default-rtdb.firebaseio.com",
  projectId: "class-test02182026",
  storageBucket: "class-test02182026.firebasestorage.app",
  messagingSenderId: "521325222100",
  appId: "1:521325222100:web:d98b8d77c10656f872c341"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const rtdb = getDatabase(app);