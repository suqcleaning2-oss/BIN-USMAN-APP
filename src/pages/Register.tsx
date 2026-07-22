import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Phone, Check, X } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'number', label: 'One number (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (e.g. !@#$%)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(pw) }
];

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const navigate = useNavigate();

  // Handle redirect result if user returning from signInWithRedirect
  React.useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const user = result.user;
          // Create user document in Firestore on Google Sign-In if not exists
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
            const userData = {
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
            };
            try {
              await setDoc(docRef, userData);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            }
          }

          toast.success('Signed in successfully!');
          navigate('/');
        }
      } catch (error: any) {
        console.error("Redirect error:", error);
        toast.error("Failed to sign in after redirect");
      }
    };
    handleRedirect();
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToPrivacy) {
      toast.error('You must agree to the Privacy Policy to continue');
      return;
    }
    
    setLoading(true);

    if (!fullName.trim()) {
      toast.error('Full Name is required');
      setLoading(false);
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone Number is required');
      setLoading(false);
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      setLoading(false);
      return;
    }

    const isPasswordValid = PASSWORD_REQUIREMENTS.every(req => req.test(password));
    if (!isPasswordValid) {
      toast.error('The password does not meet all security requirements.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update name in Auth profile
      await updateProfile(user, { displayName: fullName });

      // Create user document in Firestore
      const isAdminEmail = email.toLowerCase() === 'suqcleaning2@gmail.com' || email.toLowerCase() === 'mqaisar11550@gmail.com';
      const userData = {
        id: user.uid,
        uid: user.uid,
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        role: isAdminEmail ? 'admin' : 'user',
        blocked: false,
        createdAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'users', user.uid), userData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }

      setLoading(false);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized. Please add this URL to Firebase Authorized Domains.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message || 'Failed to create account');
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

      // Create user document in Firestore on Google Sign-In if not exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const isAdminEmail = user.email?.toLowerCase() === 'suqcleaning2@gmail.com' || user.email?.toLowerCase() === 'mqaisar11550@gmail.com';
        const userData = {
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
        };
        try {
          await setDoc(docRef, userData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      toast.success('Signed in successfully!');
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
      } else {
        toast.error('Failed to sign in with Google');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="bg-white rounded-[3rem] border border-secondary shadow-2xl p-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary-dark border border-primary/20 mx-auto">
            <User size={32} strokeWidth={1} />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tighter text-heading uppercase">Create <span className="text-primary-dark italic font-normal">Account</span></h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30">JOIN BIN USMAN</p>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-4 bg-background/50 hover:bg-background text-heading py-4 rounded-2xl font-bold transition-all border border-secondary shadow-sm group"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
            <span className="text-[11px] font-black uppercase tracking-widest">Sign up with Google</span>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-secondary"></span>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase">
              <span className="bg-white px-4 text-body/30 font-black tracking-[0.3em]">Or Sign up with Email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Full Name"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type="tel"
                placeholder="Phone Number (e.g. 03001234567)"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-6 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
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
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-body/30 italic">Security Level: High</label>
                <label className="text-[9px] font-black uppercase tracking-widest text-primary-dark italic">Complex Rules</label>
              </div>
              <Lock className="absolute left-5 top-[60%] -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={18} />
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="Password (min. 8 characters)"
                className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
            
            {password && (
              <div className="p-4 bg-background/50 rounded-2xl border border-secondary space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[9px] font-black text-body/40 uppercase tracking-widest">Password Requirements:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const isMet = req.test(password);
                    return (
                      <div key={req.id} className="flex items-center gap-2 text-xs font-semibold">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isMet ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-400'}`}>
                          {isMet ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                        </span>
                        <span className={isMet ? 'text-green-700/80' : 'text-red-500/80'}>{req.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 px-1">
            <input 
              type="checkbox"
              id="privacy-policy"
              className="w-5 h-5 rounded-lg border-secondary text-primary-dark focus:ring-primary/20 accent-primary-dark cursor-pointer transition-all"
              checked={agreedToPrivacy}
              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
              required
            />
            <label htmlFor="privacy-policy" className="text-[10px] font-black uppercase tracking-wider text-body/40 cursor-pointer select-none">
              I agree to the <Link to="/privacy-policy" className="text-primary-dark hover:underline underline-offset-4 transition-all">Privacy Policy</Link> and <Link to="/terms-conditions" className="text-primary-dark hover:underline underline-offset-4 transition-all">Terms & Conditions</Link>
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="primary-button w-full h-16 flex items-center justify-center gap-3 text-[11px]"
          >
            {loading ? 'Wait...' : 'Sign Up Now'}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-[10px] font-black tracking-[0.15em] text-body/30 uppercase">
            Already have an account? {' '}
            <Link to="/login" className="text-primary-dark hover:underline underline-offset-4">Login Now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
