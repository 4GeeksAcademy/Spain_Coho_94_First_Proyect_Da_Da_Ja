// Este archivo NO debe usar import/export - es un Service Worker

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBkoWhY15h0KoXnrB-ZnL4SjGVsx8mHTjo",
  authDomain: "store4us-21dbe.firebaseapp.com",
  projectId: "store4us-21dbe",
  storageBucket: "store4us-21dbe.firebasestorage.app",
  messagingSenderId: "1006937973576",
  appId: "1:1006937973576:web:2e0629f543b4d5e365097d",
  measurementId: "G-Q403HG571W"
});

const messaging = firebase.messaging();

// Manejo de mensajes en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Recibido mensaje en segundo plano:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});