import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface WishlistItem {
  id: string;
  userId: string;
  listingId: string;
  createdAt: any;
}

export const addToWishlist = async (userId: string, listingId: string) => {
  // Check if already in wishlist to prevent duplicates
  const path = 'wishlists';
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    where('listingId', '==', listingId)
  );
  
  let snapshot;
  try {
    snapshot = await getDocs(q);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    throw err; // Should not reach here
  }
  
  if (!snapshot.empty) return snapshot.docs[0].id;

  try {
    const docRef = await addDoc(collection(db, path), {
      userId,
      listingId,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    throw err;
  }
};

export const removeFromWishlist = async (wishlistId: string) => {
  const path = `wishlists/${wishlistId}`;
  try {
    await deleteDoc(doc(db, 'wishlists', wishlistId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

export const getWishlistStatus = async (userId: string, listingId: string) => {
  const path = 'wishlists';
  const q = query(
    collection(db, path),
    where('userId', '==', userId),
    where('listingId', '==', listingId)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : snapshot.docs[0].id;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
};

export const getUserWishlist = async (userId: string) => {
  const path = 'wishlists';
  const q = query(
    collection(db, path),
    where('userId', '==', userId)
  );
  try {
    const snapshot = await getDocs(q);
    
    const listingIds = snapshot.docs.map(doc => doc.data().listingId);
    const wishlistItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WishlistItem));

    return { listingIds, wishlistItems };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return { listingIds: [], wishlistItems: [] };
  }
};
