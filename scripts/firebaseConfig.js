import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3y581S0nHqYfIX4TjvumGKLgpDj1G1dg",
  authDomain: "lex-academy-10eef.firebaseapp.com",
  projectId: "lex-academy-10eef",
  storageBucket: "lex-academy-10eef.firebasestorage.app",
  messagingSenderId: "512518959635",
  appId: "1:512518959635:web:b2463918d2633a4bea85e6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);