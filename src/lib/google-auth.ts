import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  User,
  UserCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebase";

async function getNativeGoogleCredential() {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;

  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  return GoogleAuthProvider.credential(idToken, result.credential?.accessToken);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  if (Capacitor.isNativePlatform()) {
    const credential = await getNativeGoogleCredential();
    const userCredential = await signInWithCredential(auth, credential);
    await userCredential.user.getIdToken(true);
    return userCredential;
  }

  return signInWithPopup(auth, provider);
}

export async function reauthenticateWithGoogle(user: User): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  if (Capacitor.isNativePlatform()) {
    const credential = await getNativeGoogleCredential();
    return reauthenticateWithCredential(user, credential);
  }

  return reauthenticateWithPopup(user, provider);
}
