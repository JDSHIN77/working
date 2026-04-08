import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVGMfC1KQKEh6dK-1FbMUphtWvSZAUahM",
  authDomain: "workflow7777.firebaseapp.com",
  projectId: "workflow7777",
  storageBucket: "workflow7777.firebasestorage.app",
  messagingSenderId: "485559788579",
  appId: "1:485559788579:web:c6482352e7f9b9c7bebd96"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
