import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer, settings } from "firebase/firestore";
import { Platform } from "react-native";

const iosConfig = {
  apiKey: "AIzaSyD4DjP_aWBMYk0Rrk6KmfSpiHmXtYNNLc",
  authDomain: "bin-usman-ab.firebaseapp.com",
  projectId: "bin-usman-ab",
  storageBucket: "bin-usman-ab.firebasestorage.app",
  messagingSenderId: "948662076158",
  appId: "1:948662076158:web:a0ff2a42ff6b1351dadbaf"
};

const firebaseConfig = Platform.OS === "ios"
  ? iosConfig
  : {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID,
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID
    };

// Initialize Firebase
console.log("Initializing Firebase with project:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly configure browserLocalPersistence to robustly persist authentication state
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase local persistence set successfully to browserLocalPersistence");
  })
  .catch((err) => {
    console.error("Error setting Firebase local persistence:", err);
  });

// Configure offline local cache for Firestore to enable instantaneous data retrieval and minimize network usage
const firestoreSettings = {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
};

export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? initializeFirestore(app, firestoreSettings, (firebaseConfig as any).firestoreDatabaseId)
  : initializeFirestore(app, firestoreSettings);

settings(db, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: true,
});

console.log("Firestore initialized with persistent local cache for database:", (firebaseConfig as any).firestoreDatabaseId || "(default)");
export const storage = null as any;

// Validate Connection to Firestore
async function testConnection() {
  try {
    // Attempt to read a dummy document to verify connectivity
    console.log("Testing Firestore connection to /test/connection...");
    const snap = await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test result:", snap.exists() ? "Document exists" : "Document does not exist (but allowed)");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    } else {
      console.error("Firestore connection error (detailed):", error);
    }
  }
}
testConnection();
