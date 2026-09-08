import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";

let app;
let auth;
let db;

const firebaseConfig = {
  apiKey: "AIzaSyD4DjP_6W8myk0Qrk6kmfSpiHeMxtYNNlc",
  authDomain: "bin-usman-ab.firebaseapp.com",
  projectId: "bin-usman-ab",
  storageBucket: "bin-usman-ab.firebasestorage.app",
  messagingSenderId: "948662076158",
  appId: "1:948662076158:web:2690704da003c325dadbaf"
};

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (error) {
  console.warn('[Firebase] Persistent Firestore cache unavailable; using network mode.', error);
  db = getFirestore(app);
}

export { app, auth, db };
