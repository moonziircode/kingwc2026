import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  projectId: "king-gambler-wc2026",
  appId: "1:457649338865:web:de21c70b4ade2bf0412c50",
  storageBucket: "king-gambler-wc2026.firebasestorage.app",
  apiKey: "AIzaSyB2gsDM3urtVavsarxaDRC4aw56Uf1Pr8Q",
  authDomain: "king-gambler-wc2026.firebaseapp.com",
  messagingSenderId: "457649338865"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
