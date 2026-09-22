import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  OAuthProvider, 
  GoogleAuthProvider, 
  AuthProvider as FirebaseAuthProvider 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { getHighResGooglePhoto } from '../lib/avatar-utils';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'admin';
  photoURL?: string | null;
  photo?: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isNativeApp: boolean;
  signInWithApple: () => Promise<User | null>;
  signInWithGoogle: () => Promise<User | null>;
  universalSignInWithProvider: (provider: FirebaseAuthProvider) => Promise<User | null>;
}

// 1. Platform detector: Web vs iOS/Android Native (Capacitor WKWebView)
export const checkIsNativePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  const isCapacitorWindow = Boolean(win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform());
  const isCapacitorCore = Boolean(typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  return isCapacitorWindow || isCapacitorCore;
};

export const isNativeApp = checkIsNativePlatform();

// Helper to sync authenticated user to Firestore database
export const syncUserToFirestore = async (user: User) => {
  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    const isAdminEmail = 
      user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || 
      user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
    const displayName = user.displayName || user.email?.split('@')[0] || 'User';
    const highResPhoto = getHighResGooglePhoto(user.photoURL);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        id: user.uid,
        uid: user.uid,
        fullName: displayName,
        name: displayName,
        email: user.email || '',
        phone: user.phoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: highResPhoto,
        photo: highResPhoto,
        role: isAdminEmail ? 'admin' : 'user',
        blocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        fullName: docSnap.data()?.fullName || displayName,
        email: user.email || docSnap.data()?.email || '',
        photoURL: highResPhoto || docSnap.data()?.photoURL || null,
        photo: highResPhoto || docSnap.data()?.photo || null,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn("[Auth] Error syncing user profile to Firestore:", err);
  }
};

// 2. Universal login function:
// - If isNativeApp is TRUE (for both Android & iOS App): Use signInWithRedirect(auth, provider)
// - If isNativeApp is FALSE (for Web): Use signInWithPopup(auth, provider)
export const universalSignInWithProvider = async (provider: FirebaseAuthProvider): Promise<User | null> => {
  const native = checkIsNativePlatform();
  console.log(`[Auth] Initiating social sign in (isNativePlatform: ${native})...`);

  if (native) {
    // In Capacitor iOS WKWebView and Android, signInWithPopup is blocked or loses context.
    // Use signInWithRedirect and complete on app restart with getRedirectResult.
    await signInWithRedirect(auth, provider);
    return null;
  } else {
    // On Web (https://), signInWithPopup delivers the fastest and smoothest popup flow.
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }
};

// 4. Apple provider configuration with email & name scopes and try/catch error handling
export const signInWithApple = async (): Promise<User | null> => {
  try {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');

    const user = await universalSignInWithProvider(provider);
    if (user) {
      console.log("Apple user:", user);
      await syncUserToFirestore(user);
    }
    return user;
  } catch (error: any) {
    console.error("Apple Sign In Error:", error);
    // 6. Safe error message instead of crashing
    toast.error("Apple Sign In failed, please try Email login");
    return null;
  }
};

// Google provider configuration
export const signInWithGoogle = async (): Promise<User | null> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const user = await universalSignInWithProvider(provider);
    if (user) {
      console.log("Google user:", user);
      await syncUserToFirestore(user);
    }
    return user;
  } catch (error: any) {
    console.error("Google Sign In Error:", error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      try {
        console.log("[Auth] Popup cancelled or closed, falling back to redirect...");
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectErr) {
        console.error("Redirect fallback error:", redirectErr);
      }
    }
    toast.error("Failed to sign in with Google. Please try again.");
    return null;
  }
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isNativeApp: false,
  signInWithApple: async () => null,
  signInWithGoogle: async () => null,
  universalSignInWithProvider: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isNative = checkIsNativePlatform();

  // 3. On app start (in App.jsx / main.jsx / AuthProvider), always call getRedirectResult(auth)
  // to complete the login after redirect returns on iOS (capacitor://localhost) and Android (https://localhost).
  useEffect(() => {
    let isMounted = true;

    const handleRedirectFlow = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user && isMounted) {
          console.log("[Auth] Completed redirect sign-in:", result.user);
          await syncUserToFirestore(result.user);
          toast.success("Welcome back!");
        }
      } catch (error: any) {
        console.error("[Auth] getRedirectResult error:", error);
        if (!isMounted) return;
        
        const isAppleError = 
          error?.code?.toLowerCase().includes('apple') || 
          error?.message?.toLowerCase().includes('apple') ||
          error?.customData?.providerId === 'apple.com';

        if (isAppleError) {
          // 6. Safe graceful notice if Apple Sign In redirect fails
          toast.error("Apple Sign In failed, please try Email login");
        } else if (error?.code && error.code !== 'auth/null-user') {
          toast.error("Sign in after redirect failed. Please try again.");
        }
      }
    };

    handleRedirectFlow();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to auth state and user profile changes
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let hiddenTimestamp: number = 0;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenTimestamp = Date.now();
      } else if (document.visibilityState === 'visible') {
        const timeHidden = hiddenTimestamp ? (Date.now() - hiddenTimestamp) : 0;
        console.log(`[Auth] App brought to foreground. Duration hidden: ${Math.round(timeHidden / 1000)}s`);

        if (auth.currentUser) {
          try {
            await auth.currentUser.reload();
            await auth.currentUser.getIdToken(true);
            console.log("[Auth] Session active. Token refreshed successfully on resume.");
          } catch (error: any) {
            const isNetworkError = 
              error?.code === 'auth/network-request-failed' || 
              (error?.message && error.message.includes('network-request-failed')) ||
              !navigator.onLine;

            if (isNetworkError) {
              console.warn("[Auth] Network connection unavailable on resume. Firebase Auth will retry automatically.");
            } else {
              console.error("[Auth] Session broken or corrupted on resume. Executing soft refresh:", error);
              window.location.reload();
            }
          }
        } else if (hiddenTimestamp && timeHidden >= 4.5 * 60 * 1000) {
          console.log("[Auth] Resumed after 5+ minutes in background. Invoking soft page refresh.");
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Sync profile to ensure latest record exists
        syncUserToFirestore(firebaseUser).catch(() => {});

        const profileRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          const rawPhoto = firebaseUser.photoURL || null;
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const effectivePhoto = getHighResGooglePhoto(data.photoURL || data.photo || rawPhoto);
            setProfile({
              ...data,
              photoURL: effectivePhoto,
              photo: effectivePhoto,
            });
          } else {
            const isAdminEmail = firebaseUser.email === 'suqcleaning2@gmail.com' || firebaseUser.email === 'mqaisar11550@gmail.com';
            const effectivePhoto = getHighResGooglePhoto(rawPhoto);
            setProfile({
              id: firebaseUser.uid,
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              phone: '',
              role: isAdminEmail ? 'admin' : 'user',
              photoURL: effectivePhoto,
              photo: effectivePhoto,
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to profile:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin: profile?.role === 'admin',
      isNativeApp: isNative,
      signInWithApple,
      signInWithGoogle,
      universalSignInWithProvider
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
