import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";

let app;
let auth;
let db;

const firebaseConfig = {
  apiKey: "AIzaSy0ADJP_aWBmYK0RkReKaFSp1mHXTYNNLC",
  authDomain: "bin-usman-ab.firebaseapp.com",
  projectId: "bin-usman-ab",
  storageBucket: "bin-usman-ab.firebasestorage.app",
  messagingSenderId: "848682076158",
  appId: "1:848682076158:web:ai0ff2a42ff6b1353dad1af"
};

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export { app, auth, db };
