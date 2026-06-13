import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const navigate = useNavigate();

  // Handle redirect result if user returning from signInWithRedirect
  React.useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const user = result.user;
          // Sync user to Firestore if not exists
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
            await setDoc(docRef, {
              id: user.uid,
              uid: user.uid,
              fullName: user.displayName || 'Google User',
              name: user.displayName || 'Google User',
              email: user.email || '',
              phone: user.phoneNumber || '',
              phoneNumber: user.phoneNumber || '',
              role: isAdminEmail ? 'admin' : 'user',
              blocked: false,
              createdAt: serverTimestamp(),
            });
          }

          toast.success('Welcome back!');
          navigate('/');
        }
      } catch (error: any) {
        console.error("Redirect error:", error);
        toast.error("Failed to sign in after redirect");
      }
    };
    handleRedirect();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

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
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add this URL to Firebase authorized domains.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error('Invalid email or password. Please try again.');
      } else {
        toast.error(error.message || 'Failed to sign in');
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

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Sync user to Firestore if not exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
        await setDoc(docRef, {
          id: user.uid,
          uid: user.uid,
          fullName: user.displayName || 'Google User',
          name: user.displayName || 'Google User',
          email: user.email || '',
          phone: user.phoneNumber || '',
          phoneNumber: user.phoneNumber || '',
          role: isAdminEmail ? 'admin' : 'user',
          blocked: false,
          createdAt: serverTimestamp(),
        });
      }

      toast.success('Welcome back!');
      navigate('/');
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
      <div className="max-w-md mx-auto py-12">
        <div className="glass-card space-y-8">
          <button 
            onClick={() => setShowForgotPassword(false)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-bold"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tighter">RESET <span className="text-primary italic">PASSWORD</span></h1>
            <p className="text-zinc-500 text-sm">Enter your email for the reset link</p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="email"
                placeholder="Email Address"
                className="input-field w-full pl-12"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="primary-button w-full flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
              <ArrowRight size={18} />
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

        <div className="space-y-4">
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
            <Link to="/register" className="text-primary-dark hover:underline underline-offset-4">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
