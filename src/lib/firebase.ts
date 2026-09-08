import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyD4DjP_6W8myk0Qrk6kmfSpiHeMxtYNNlc",
  authDomain: "bin-usman-ab.firebaseapp.com",
  projectId: "bin-usman-ab",
  storageBucket: "bin-usman-ab.firebasestorage.app",
  messagingSenderId: "948662076158",
  appId: "1:948662076158:web:2690704da003c325dadbaf"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function isNativeRuntime() {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === "undefined") return false;
  return window.location.protocol === "capacitor:" || window.location.protocol === "ionic:";
}

function isAppleMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const isNative = isNativeRuntime();
const needsIosNetworkWorkaround = isNative || isAppleMobileBrowser();

function createAuth() {
  if (needsIosNetworkWorkaround) {
    try {
      // Native WKWebView needs IndexedDB. iPhone Safari IndexedDB often hangs, so use localStorage there.
      return initializeAuth(app, {
        persistence: isNative ? indexedDBLocalPersistence : browserLocalPersistence,
      });
    } catch (error) {
      console.warn("[Firebase] Auth already initialized; reusing existing instance.", error);
      return getAuth(app);
    }
  }

  return getAuth(app);
}

function createDb() {
  try {
    if (needsIosNetworkWorkaround) {
      // iPhone Safari and WKWebView often fail Firestore's default WebChannel streaming.
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    }

    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager(),
      }),
    });
  } catch (error) {
    console.warn("[Firebase] Firestore already initialized or cache unavailable; using default instance.", error);
    return getFirestore(app);
  }
}

const auth = createAuth();
const db = createDb();

console.log("[Firebase] initialized", {
  native: isNative,
  platform: Capacitor.getPlatform(),
  protocol: typeof window !== "undefined" ? window.location.protocol : "n/a",
});

export { app, auth, db };
