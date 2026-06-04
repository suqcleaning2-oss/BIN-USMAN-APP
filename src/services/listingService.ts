import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export async function updateListingRating(listingId: string) {
  try {
    const reviewsPath = 'reviews';
    const reviewsQ = query(
      collection(db, reviewsPath),
      where('listingId', '==', listingId)
    );
    
    let reviewsSnapshot;
    try {
      reviewsSnapshot = await getDocs(reviewsQ);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, reviewsPath);
    }
    
    let totalRatings = 0;
    const totalReviews = reviewsSnapshot.size;

    if (totalReviews === 0) {
      const listingPath = `listings/${listingId}`;
      try {
        await updateDoc(doc(db, 'listings', listingId), {
          rating: 0,
          reviewCount: 0
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, listingPath);
      }
      return;
    }

    reviewsSnapshot.forEach((doc) => {
      totalRatings += doc.data().rating || 0;
    });

    const averageRating = Number((totalRatings / totalReviews).toFixed(1));

    const listingPath = `listings/${listingId}`;
    try {
      await updateDoc(doc(db, 'listings', listingId), {
        rating: averageRating,
        reviewCount: totalReviews
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, listingPath);
    }
    
    console.log(`Updated listing ${listingId} rating to ${averageRating} (${totalReviews} reviews)`);
  } catch (error) {
    console.error("Error updating listing rating:", error);
    throw error;
  }
}
