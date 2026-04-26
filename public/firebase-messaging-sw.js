// Firebase Cloud Messaging Service Worker
// Este archivo debe estar en /public para que Firebase lo detecte en la raíz del dominio.

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'REEMPLAZAR_CON_API_KEY_DE_FIREBASE_CONSOLE',
  authDomain: 'emergenciavehicularyary.firebaseapp.com',
  projectId: 'emergenciavehicularyary',
  storageBucket: 'emergenciavehicularyary.firebasestorage.app',
  messagingSenderId: '663381547878',
  appId: 'REEMPLAZAR_CON_APP_ID_DE_FIREBASE_CONSOLE',
});

const messaging = firebase.messaging();

// Manejar notificaciones cuando la app está en background
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'Yary', {
    body: body ?? '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  });
});
