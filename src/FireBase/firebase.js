import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBkoWhY15h0KoXnrB-ZnL4SjGVsx8mHTjo",
  authDomain: "store4us-21dbe.firebaseapp.com",
  projectId: "store4us-21dbe",
  storageBucket: "store4us-21dbe.firebasestorage.app",
  messagingSenderId: "1006937973576",
  appId: "1:1006937973576:web:2e0629f543b4d5e365097d",
  measurementId: "G-Q403HG571W"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging };