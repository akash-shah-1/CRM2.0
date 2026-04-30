importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// These values are injected from the firebase-applet-config.json
// However, in a service worker, we often need to hardcode them or use a build step.
// For the preview, the following placeholder approach is used.
// Note: In production, you would fetch these or use a templating step.

firebase.initializeApp({
  apiKey: "AIzaSyCnLYcJ2e0Y1g7LAABt9aMrCiBahoPhhMM",
  authDomain: "gen-lang-client-0862562864.firebaseapp.com",
  projectId: "gen-lang-client-0862562864",
  storageBucket: "gen-lang-client-0862562864.firebasestorage.app",
  messagingSenderId: "430115246452",
  appId: "1:430115246452:web:f19a6b81fe04587edb1c21"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
