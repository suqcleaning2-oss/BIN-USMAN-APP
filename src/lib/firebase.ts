import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from '../../firebase-applet-config.json';

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

export const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
console.log("Firestore initialized for database:", (firebaseConfig as any).firestoreDatabaseId || "(default)");
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
