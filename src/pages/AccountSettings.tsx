import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword, 
  deleteUser, 
  GoogleAuthProvider, 
  reauthenticateWithPopup 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { 
  Shield, 
  Lock, 
  Trash2, 
  Check, 
  X, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  User, 
  AlertTriangle,
  LogOut,
  Mail,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
  { id: 'number', label: 'One number (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (e.g. !@#$%)', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/~`]/.test(pw) }
];

export default function AccountSettings() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Deletion state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: initial warning, 2: re-auth password, 3: deleting
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Checks
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  const checkRequirement = (testFn: (pw: string) => boolean) => testFn(newPassword);
  const isPasswordValid = PASSWORD_REQUIREMENTS.every(req => req.test(newPassword));

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isGoogleUser && !currentPassword) {
      toast.error('Current password is required.');
      return;
    }

    if (!isPasswordValid) {
      toast.error('The new password does not meet all security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      if (!isGoogleUser) {
        // Step 1: Re-authenticate
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
      }

      // Step 2: Update Password
      await updatePassword(user, newPassword);
      
      toast.success('Password updated successfully! For security, please log in again.');
      
      // Step 3: Sign out
      await auth.signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid current password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('For security, please log out and log back in before changing your password.');
      } else {
        toast.error(error.message || 'Failed to update password.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Perform full account and Firestore data deletion
  const executeAccountDeletion = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteStep(3);

    const userId = user.uid;
    const userEmail = user.email;

    try {
      console.log('Initiating complete account purge for:', userId);
      const batch = writeBatch(db);

      // 1. Delete Wishlists
      const wishlistsRef = collection(db, 'wishlists');
      const wishlistsQuery = query(wishlistsRef, where('userId', '==', userId));
      const wishlistsSnap = await getDocs(wishlistsQuery);
      wishlistsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      console.log(`Queued ${wishlistsSnap.size} wishlists for deletion`);

      // 2. Delete Bookings
      const bookingsRef = collection(db, 'bookings');
      const bookingsQuery = query(bookingsRef, where('userId', '==', userId));
      const bookingsSnap = await getDocs(bookingsQuery);
      bookingsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      console.log(`Queued ${bookingsSnap.size} bookings for deletion`);

      // 3. Delete Reviews
      const reviewsRef = collection(db, 'reviews');
      const reviewsQuery = query(reviewsRef, where('userId', '==', userId));
      const reviewsSnap = await getDocs(reviewsQuery);
      reviewsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      console.log(`Queued ${reviewsSnap.size} reviews for deletion`);

      // 4. Delete Lister Applications
      if (userEmail) {
        const applicationsRef = collection(db, 'lister_applications');
        const applicationsQuery = query(applicationsRef, where('email', '==', userEmail));
        const applicationsSnap = await getDocs(applicationsQuery);
        applicationsSnap.forEach((doc) => {
          batch.delete(doc.ref);
        });
        console.log(`Queued ${applicationsSnap.size} lister applications for deletion`);
      }

      // 5. Delete User Notifications
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(notificationsRef, where('userId', '==', userId));
      const notificationsSnap = await getDocs(notificationsQuery);
      notificationsSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      console.log(`Queued ${notificationsSnap.size} notifications for deletion`);

      // 6. Delete Failed Login Attempts (if any exist)
      if (userEmail) {
        const emailId = userEmail.toLowerCase().trim();
        const loginAttemptDocRef = doc(db, 'login_attempts', emailId);
        batch.delete(loginAttemptDocRef);
        console.log('Queued login attempt record for deletion');
      }

      // 7. Delete User Profile Document
      const userDocRef = doc(db, 'users', userId);
      batch.delete(userDocRef);
      console.log('Queued user profile document for deletion');

      // Commit the atomic batch
      try {
        await batch.commit();
        console.log('Successfully deleted all Firestore assets');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${userId}/purge`);
      }

      // 8. Delete user files from Firebase Storage if any exist
      try {
        const storageInstance = getStorage();
        if (storageInstance) {
          const userStorageRef = ref(storageInstance, `users/${userId}`);
          const listResult = await listAll(userStorageRef);
          const deletePromises = listResult.items.map((item) => deleteObject(item));
          await Promise.all(deletePromises);
          console.log(`Deleted ${listResult.items.length} storage files for user`);
        }
      } catch (storageErr) {
        console.warn("Storage deletion skipped or failed (perhaps Storage is not enabled or empty):", storageErr);
      }

      // 9. Delete Authentication Profile and Sign Out
      await deleteUser(user);
      await auth.signOut();
      console.log('Deleted user auth record and signed out successfully.');

      toast.success('Your account and all associated data have been deleted permanently.');
      navigate('/');
    } catch (error: any) {
      console.error('Account deletion error:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('This action requires recent re-authentication. Please log out, log back in, and try again.');
        setDeleteStep(1);
      } else {
        toast.error(error.message || 'Failed to delete your account. Please contact customer support.');
        setDeleteStep(1);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setDeleting(true);
    try {
      if (isGoogleUser) {
        // Re-auth Google user
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
        await executeAccountDeletion();
      } else {
        // Re-auth password user
        if (!deletePassword) {
          toast.error('Please enter your password to proceed.');
          setDeleting(false);
          return;
        }
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
        await executeAccountDeletion();
      }
    } catch (error: any) {
      console.error('Re-authentication failed:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Invalid password. Please try again.');
      } else {
        toast.error(error.message || 'Authentication failed. Unable to proceed.');
      }
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <h2 className="text-xl font-bold uppercase tracking-widest text-heading mb-4">Access Denied</h2>
        <p className="text-sm text-body/50 mb-8 uppercase tracking-wider">Please login to view account settings.</p>
        <button onClick={() => navigate('/login')} className="primary-button px-8 py-4">Login Now</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
      {/* Back button */}
      <div className="flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-secondary text-[10px] font-black uppercase tracking-[0.2em] text-heading hover:bg-neutral-50 hover:text-primary-dark transition-all duration-300 shadow-sm active:scale-95 cursor-pointer group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
          <span>Back</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-secondary pb-10">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter uppercase text-heading leading-none">
            Account <span className="text-primary-dark italic font-normal">Settings</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-body/30 max-w-xs">
            Manage your credentials and privacy.
          </p>
        </div>
        <div className="bg-white px-6 py-2.5 rounded-full border border-secondary shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-widest text-heading">Secure Profile Management</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Summary info card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-secondary p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-primary-dark" />
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-primary-dark text-white rounded-full flex items-center justify-center text-2xl font-semibold mx-auto shadow-md">
                {profile?.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-heading uppercase tracking-tight">{profile?.fullName || 'User'}</h3>
                <span className="inline-block px-3 py-1 bg-[#D4AF37]/10 text-primary-dark text-[9px] font-black uppercase tracking-widest rounded-full border border-[#D4AF37]/20">
                  {profile?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'PREMIUM MEMBER'}
                </span>
              </div>
            </div>

            <div className="h-px bg-secondary" />

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-body/70">
                <Mail size={14} className="text-primary-dark shrink-0" />
                <span className="text-xs font-semibold truncate select-all">{user.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 text-body/70">
                  <Phone size={14} className="text-primary-dark shrink-0" />
                  <span className="text-xs font-semibold select-all">{profile.phone}</span>
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                await auth.signOut();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 border border-red-200 hover:border-red-600 rounded-xl text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
            >
              <LogOut size={12} />
              <span>Log out</span>
            </button>
          </div>

          {/* Theme Settings Card */}
          <div className="bg-white dark:bg-zinc-950 rounded-[2rem] border border-secondary dark:border-zinc-800 p-8 space-y-6 shadow-xl relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D4AF37]" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-heading uppercase tracking-tight">Theme Preferences</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-body/30">Customize your workspace appearance</p>
            </div>
            
            <div className="h-px bg-secondary dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-body/70 dark:text-zinc-400">Dark Mode</span>
              <button
                onClick={toggleTheme}
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                  isDark ? 'bg-[#D4AF37]' : 'bg-neutral-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                    isDark ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Form 1: Password Modification */}
          <div className="bg-white rounded-[2.5rem] border border-secondary p-8 md:p-10 space-y-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D4AF37]" />
            <div className="space-y-2">
              <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Shield size={12} />
                Credentials security
              </span>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">Change Password</h2>
              <p className="text-xs text-body/50">Update your security passkey. Weak passwords will be prevented.</p>
            </div>

            {isGoogleUser ? (
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-amber-800 text-xs font-medium uppercase tracking-wide leading-relaxed">
                You are signed in with Google. Password management is managed externally via your Google Account.
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div className="space-y-4">
                  {/* Current Password */}
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={16} />
                    <input 
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Current Password"
                      className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>

                  {/* New Password */}
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={16} />
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      placeholder="New Password"
                      className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
                    >
                      {showNewPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>

                  {/* Dynamic Password Policy Real-time Verification Checklist */}
                  {newPassword && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-background/50 rounded-2xl border border-secondary space-y-2.5"
                    >
                      <p className="text-[9px] font-black text-body/40 uppercase tracking-widest">Password requirements:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {PASSWORD_REQUIREMENTS.map((req) => {
                          const isMet = checkRequirement(req.test);
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
                    </motion.div>
                  )}

                  {/* Confirm New Password */}
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={16} />
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm New Password"
                      className="w-full bg-background/30 border border-secondary rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-body/20 italic"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={changingPassword || !isPasswordValid || newPassword !== confirmPassword}
                  className="w-full h-14 bg-[#D4AF37] hover:bg-[#c29e2e] disabled:bg-neutral-100 disabled:text-neutral-400 text-neutral-900 flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-black rounded-2xl active:scale-95 transition-all cursor-pointer shadow-md"
                >
                  {changingPassword ? 'Updating Passkey...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>

          {/* Form 2: Privacy and Account Purge */}
          <div className="bg-white rounded-[2.5rem] border border-secondary p-8 md:p-10 space-y-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-500" />
            <div className="space-y-2">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.25em] flex items-center gap-1.5">
                <Trash2 size={12} />
                Dangerous action
              </span>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-heading">Delete My Account</h2>
              <p className="text-xs text-body/50">
                Permanently purge your account, profile, bookings, wishlist, reviews, applications, notifications, and all personal data. This complies with Apple App Store Guideline 5.1.1.
              </p>
            </div>

            {!confirmDelete ? (
              <button 
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full h-14 bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 text-red-600 hover:text-white flex items-center justify-center gap-3 text-[11px] uppercase tracking-widest font-black rounded-2xl active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 size={14} />
                Purge Account Permanent
              </button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-red-50/50 border border-red-200 rounded-3xl space-y-6"
              >
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-red-800">Critical Warning: Immediate irreversible data loss</h3>
                    <p className="text-xs text-red-700/80 leading-relaxed font-medium">
                      Continuing will completely purge your profile, remove bookings, delete your reviews, empty your wishlist, clear applications, and delete your email and account credentials. This cannot be undone.
                    </p>
                  </div>
                </div>

                {deleteStep === 1 && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-3 bg-white border border-secondary text-heading hover:bg-neutral-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center active:scale-95 shadow-md shadow-red-600/10"
                    >
                      Yes, Proceed
                    </button>
                  </div>
                )}

                {deleteStep === 2 && (
                  <form onSubmit={handleDeleteSubmit} className="space-y-4 pt-2">
                    {isGoogleUser ? (
                      <div className="space-y-4">
                        <p className="text-xs text-red-800 font-semibold uppercase tracking-wide">
                          You are registered with Google. Re-authentication is required before account deletion.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => setDeleteStep(1)}
                            className="flex-1 py-3 bg-white border border-secondary text-heading hover:bg-neutral-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center"
                          >
                            Go Back
                          </button>
                          <button
                            type="submit"
                            disabled={deleting}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center active:scale-95 flex items-center justify-center gap-2"
                          >
                            {deleting ? 'Deleting...' : 'Authenticate Google & Delete'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs text-red-800 font-semibold uppercase tracking-wide">
                          Please enter your current password to verify ownership:
                        </p>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-body/20 group-focus-within:text-primary-dark transition-colors" size={16} />
                          <input 
                            type={showDeletePassword ? "text" : "password"}
                            placeholder="Current Password"
                            className="w-full bg-white border border-red-200 focus:border-red-500 rounded-2xl pl-14 pr-14 py-4 text-sm font-semibold focus:outline-none focus:ring-8 focus:ring-red-500/5 transition-all placeholder:text-body/20 italic"
                            required
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-body/20 hover:text-primary-dark transition-colors"
                          >
                            {showDeletePassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteStep(1);
                              setDeletePassword('');
                            }}
                            className="flex-1 py-3 bg-white border border-secondary text-heading hover:bg-neutral-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center"
                          >
                            Go Back
                          </button>
                          <button
                            type="submit"
                            disabled={deleting || !deletePassword}
                            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-center active:scale-95 flex items-center justify-center gap-2"
                          >
                            {deleting ? 'Deleting...' : 'Verify Password & Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {deleteStep === 3 && (
                  <div className="py-6 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest font-mono">
                      Purging secure ledger from data centers...
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
