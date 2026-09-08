import { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const ADMIN_EMAILS = ["suqcleaning2@gmail.com", "mqaisar11550@gmail.com"];

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

function sanitizePhone(phone?: string | null) {
  const value = (phone || "").trim();
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? value : "";
}

export function buildUserProfileData(
  user: User,
  extras?: { fullName?: string; phone?: string; email?: string }
) {
  const email = (extras?.email || user.email || "").trim();
  const fullName = (
    extras?.fullName ||
    user.displayName ||
    email.split("@")[0] ||
    "User"
  ).trim();

  return {
    id: user.uid,
    fullName,
    name: fullName,
    email,
    phone: sanitizePhone(extras?.phone ?? user.phoneNumber),
    role: isAdminEmail(email) ? "admin" : "user",
    blocked: false,
    createdAt: serverTimestamp(),
  };
}

export async function ensureUserProfile(
  user: User,
  extras?: { fullName?: string; phone?: string; email?: string }
) {
  await user.getIdToken(true);

  const profileRef = doc(db, "users", user.uid);
  try {
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      await setDoc(profileRef, buildUserProfileData(user, extras));
    }
  } catch (error) {
    console.warn("[Auth] User profile sync skipped:", error);
  }
}
