import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
            // Re-auth / reload user and force token refresh on app foreground
            await auth.currentUser.reload();
            await auth.currentUser.getIdToken(true);
            console.log("[Auth] Session active. Token refreshed successfully on resume.");
          } catch (error) {
            console.error("[Auth] Session broken or corrupted on resume. Executing soft refresh:", error);
            window.location.reload();
          }
        } else if (hiddenTimestamp && timeHidden >= 4.5 * 60 * 1000) {
          // Softly refresh the page after 5 minutes background behavior to clean up stale resources
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
        // Listen to profile changes in Firestore
        const profileRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Fallback for new users or if doc doesn't exist yet
            const isAdminEmail = firebaseUser.email === 'suqcleaning2@gmail.com' || firebaseUser.email === 'mqaisar11550@gmail.com';
            setProfile({
              id: firebaseUser.uid,
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email || '',
              phone: '',
              role: isAdminEmail ? 'admin' : 'user'
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
      isAdmin: profile?.role === 'admin' 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
