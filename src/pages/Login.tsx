import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, OAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { getHighResGooglePhoto } from '../lib/avatar-utils';

const configureGoogleProvider = () => {
  const provider = new GoogleAuthProvider();
  // 1. Explicitly request profile and email scopes to ensure photo and personal info are fetched
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

const syncGoogleUserToFirestore = async (user: any) => {
  const docRef = doc(db, 'users', user.uid);
  const docSnap = await getDoc(docRef);
  const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
  
  // 2. Convert Google thumbnail photo (=s96-c) to HD (=s400-c)
  const highResPhoto = getHighResGooglePhoto(user.photoURL);

  if (!docSnap.exists()) {
    await setDoc(docRef, {
      id: user.uid,
      uid: user.uid,
      fullName: user.displayName || 'Google User',
      name: user.displayName || 'Google User',
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
    // If user document already exists, merge high-res photo so it is never blank
    await setDoc(docRef, {
      photoURL: highResPhoto,
      photo: highResPhoto,
      fullName: docSnap.data()?.fullName || user.displayName || 'Google User',
      email: user.email || docSnap.data()?.email || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
};

const syncAppleUserToFirestore = async (user: any) => {
  try {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
    const displayName = user.displayName || user.email?.split('@')[0] || 'Apple User';

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        id: user.uid,
        uid: user.uid,
        fullName: displayName,
        name: displayName,
        email: user.email || '',
        phone: user.phoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        photoURL: user.photoURL || null,
        photo: user.photoURL || null,
        role: isAdminEmail ? 'admin' : 'user',
        blocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        fullName: docSnap.data()?.fullName || displayName,
        email: user.email || docSnap.data()?.email || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Error syncing Apple user profile:", err);
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [lockoutActive, setLockoutActive] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterAuth = () => {
    const destination = location.state?.from || '/';
    const bookingState = location.state?.bookingState;
    navigate(destination, { state: bookingState, replace: true });
  };

  const checkLockoutStatus = async (targetEmail: string): Promise<boolean> => {
    if (!targetEmail) return false;
    const emailId = targetEmail.toLowerCase().trim();
    try {
      const docRef = doc(db, 'login_attempts', emailId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const attempts = data.attempts || 0;
        const lockedUntil = data.lockedUntil?.toMillis ? data.lockedUntil.toMillis() : (data.lockedUntil || 0);
        
        const now = Date.now();
        if (lockedUntil && lockedUntil > now) {
          const diffSec = Math.ceil((lockedUntil - now) / 1000);
          setCountdownSeconds(diffSec);
          setLockoutActive(true);
          setRemainingAttempts(0);
          return true; // Is locked
        } else {
          setLockoutActive(false);
          setCountdownSeconds(0);
          setRemainingAttempts(Math.max(0, 5 - attempts));
          return false; // Is not locked
        }
      } else {
        setLockoutActive(false);
        setCountdownSeconds(0);
        setRemainingAttempts(5);
        return false;
      }
    } catch (error) {
      console.error("Error checking lockout status:", error);
      return false;
    }
  };

  // Debounced/automatic lockout and attempts check on email typing
  React.useEffect(() => {
    if (email) {
      const delayDebounce = setTimeout(() => {
        checkLockoutStatus(email);
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setLockoutActive(false);
      setCountdownSeconds(0);
      setRemainingAttempts(null);
    }
  }, [email]);

  // Countdown timer effect
  React.useEffect(() => {
    if (countdownSeconds <= 0) {
      if (lockoutActive) {
        setLockoutActive(false);
        setRemainingAttempts(5);
        toast.success("Login lockout lifted. You can try logging in again.");
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setLockoutActive(false);
          setRemainingAttempts(5);
          toast.success("Login lockout lifted. You can try logging in again.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds, lockoutActive]);

  // Handle redirect result if user returning from signInWithRedirect
  React.useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const user = result.user;
          // Sync user with photoURL to Firestore
          await syncGoogleUserToFirestore(user);
          toast.success('Welcome back!');
          redirectAfterAuth();
        }
      } catch (error: any) {
        console.error("Redirect error:", error);
        toast.error("Failed to sign in after redirect");
      }
    };
    handleRedirect();
  }, [navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    
    setLoading(true);
    const emailId = email.toLowerCase().trim();

    // 1. Check if login is currently locked
    const isLocked = await checkLockoutStatus(email);
    if (isLocked) {
      setLoading(false);
      toast.error('Login is temporarily locked due to consecutive failed attempts. Please wait or use "Forgot Password".');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Reset failed attempts immediately after a successful login
      try {
        const attemptDocRef = doc(db, 'login_attempts', emailId);
        await setDoc(attemptDocRef, {
          attempts: 0,
          lockedUntil: null,
          lastAttemptAt: serverTimestamp()
        }, { merge: true });
        setRemainingAttempts(5);
        setLockoutActive(false);
        setCountdownSeconds(0);
      } catch (err) {
        console.error("Error resetting login attempts:", err);
      }

      // Sync user to Firestore if not exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
        await setDoc(docRef, {
          id: user.uid,
          uid: user.uid,
          fullName: user.displayName || email.split('@')[0],
          name: user.displayName || email.split('@')[0],
          email: user.email || '',
          phone: '',
          phoneNumber: '',
          role: isAdminEmail ? 'admin' : 'user',
          blocked: false,
          createdAt: serverTimestamp(),
        });
      }

      toast.success('Welcome back!');
      redirectAfterAuth();
    } catch (error: any) {
      console.error("Login error:", error);
      
      // We must handle specific authentication failures to track consecutive failed attempts
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/user-not-found'
      ) {
        try {
          const attemptDocRef = doc(db, 'login_attempts', emailId);
          const attemptSnap = await getDoc(attemptDocRef);
          let currentAttempts = 0;
          if (attemptSnap.exists()) {
            currentAttempts = attemptSnap.data().attempts || 0;
          }

          const newAttempts = currentAttempts + 1;
          if (newAttempts >= 5) {
            const lockedUntilTime = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
            await setDoc(attemptDocRef, {
              attempts: 5,
              lockedUntil: new Date(lockedUntilTime),
              lastAttemptAt: serverTimestamp()
            }, { merge: true });

            setCountdownSeconds(15 * 60);
            setLockoutActive(true);
            setRemainingAttempts(0);
            toast.error('This account is temporarily locked for 15 minutes due to 5 consecutive failed login attempts.');
          } else {
            await setDoc(attemptDocRef, {
              attempts: newAttempts,
              lockedUntil: null,
              lastAttemptAt: serverTimestamp()
            }, { merge: true });

            setRemainingAttempts(5 - newAttempts);
            toast.error(`Invalid email or password. ${5 - newAttempts} attempts remaining.`);
          }
        } catch (dbErr) {
          console.error("Error writing failed login attempt to DB:", dbErr);
          toast.error('Invalid email or password. Please try again.');
        }
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address.');
      } else if (error.code === 'auth/user-disabled') {
        toast.error('This account has been disabled. Please contact system support.');
      } else if (error.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add this URL to Firebase authorized domains.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many requests. Login has been temporarily blocked by security policy.');
      } else {
        toast.error(error.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      console.log("Reset email sent");
      toast.success('Password reset email sent. Please check your inbox.');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error("Reset error", error);
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Please enter a valid email address.');
      } else {
        toast.error('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("Apple user:", user);
      await syncAppleUserToFirestore(user);
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Apple Sign In Error:", error);
      alert(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = configureGoogleProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync user profile including high-res photo to Firestore
      await syncGoogleUserToFirestore(user);

      toast.success('Welcome back!');
      redirectAfterAuth();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        console.log("Popup closed or cancelled, retrying with redirect...");
        toast.info('Popup closed, redirecting to Google...');
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError: any) {
          console.error("Redirect sign-in error:", redirectError);
          toast.error('Failed to initiate redirect sign-in');
        }
        return;
      }
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add this URL to Firebase Authorized Domains.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Authentication credential invalid. Please try again.');
      } else {
        toast.error('Failed to sign in with Google');
      }
    }
  };

  if (showForgotPassword) {
    return (
      <div className="max-w-md mx-auto py-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="bg-white rounded-[3rem] border border-secondary shadow-2xl p-12 space-y-10">
          <button 
            onClick={() => setShowForgotPassword(false)}
            className="flex items-center gap-2 text-[10px] text-body/40 font-black tracking-widest hover:text-primary-dark transition-colors uppercase border-b border-transparent hover:border-primary-dark/20 pb-0.5"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <span>Back to Login</span>
          </button>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary-dark border border-primary/20 mx-auto">
              <Mail size={32} strokeWidth={1} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tighter text-heading uppercase">Reset <span className="text-primary-dark italic font-normal">Password</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30">Enter your email for the reset link</p>
            </div>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-8">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type="email"
                placeholder="Email Address"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="primary-button w-full h-16 flex items-center justify-center gap-3 text-[11px]"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
              <ArrowRight size={16} strokeWidth={2} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="bg-white rounded-[3rem] border border-secondary shadow-2xl p-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary-dark border border-primary/20 mx-auto">
            <Lock size={32} strokeWidth={1} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tighter text-heading uppercase">Login</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30">Welcome to Bin Usman</p>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            type="button"
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white py-4 rounded-2xl font-bold transition-all shadow-md group cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.79-11.73-14.25-5.87-9.33-10.36-19.98-13.48-31.95-3.12-11.97-4.68-23.36-4.68-34.19 0-14.73 3.63-26.68 10.88-35.85 7.25-9.17 16.32-13.87 27.2-14.1 4.58 0 9.87 1.25 15.86 3.75 6 2.5 10.15 3.78 12.46 3.84 1.84 0 6.13-1.34 12.87-4.03 6.74-2.69 12.37-3.9 16.89-3.63 12.63.62 22.47 5.37 29.53 14.25-11.05 6.74-16.45 16.08-16.19 28.02.26 9.4 3.83 17.26 10.72 23.59 6.89 6.33 15.11 10.02 24.66 11.08-2.07 6.33-4.47 12.59-7.22 18.78zm-29.39-114.7c0 7.37-2.73 14.18-8.19 20.44-5.46 6.26-12.18 9.92-20.16 10.98-.39-1.25-.59-2.48-.59-3.69 0-7.37 2.92-14.26 8.76-20.67 5.84-6.41 12.63-10.03 20.37-10.86.13 1.25.19 2.51.19 3.8z" />
            </svg>
            <span className="text-[11px] font-black uppercase tracking-widest">Continue with Apple</span>
          </button>

          <button 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-4 bg-background/50 hover:bg-background text-heading py-4 rounded-2xl font-bold transition-all border border-secondary shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
            <span className="text-[11px] font-black uppercase tracking-widest">Login with Google</span>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-secondary"></span>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase">
              <span className="bg-white px-4 text-body/30 font-black tracking-[0.3em]">Or use Email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type="email"
                placeholder="Email"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-[10px] text-body/40 font-black tracking-widest hover:text-primary-dark transition-colors uppercase border-b border-transparent hover:border-primary-dark/20 pb-0.5"
            >
              Forgot Password?
            </button>
          </div>

          {lockoutActive && countdownSeconds > 0 ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-wider text-center space-y-1 animate-in fade-in duration-300">
              <div>Login is Temporarily Locked</div>
              <div className="text-xs font-semibold text-red-700 normal-case">
                Please wait {Math.floor(countdownSeconds / 60)}m {countdownSeconds % 60}s before trying again.
              </div>
            </div>
          ) : remainingAttempts !== null && remainingAttempts < 5 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-[10px] font-black uppercase tracking-wider text-center animate-in fade-in duration-300">
              {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
            </div>
          ) : null}

          <button 
            type="submit" 
            disabled={loading}
            className="primary-button w-full h-16 flex items-center justify-center gap-3 text-[11px]"
          >
            {loading ? 'Wait...' : 'Login Now'}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[10px] font-black tracking-[0.15em] text-body/30 uppercase">
            New here? {' '}
            <Link to="/register" state={location.state} className="text-primary-dark hover:underline underline-offset-4">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
