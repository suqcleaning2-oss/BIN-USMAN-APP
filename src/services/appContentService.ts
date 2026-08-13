import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface AppContentDoc {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
  version: string;
}

const DEFAULT_PRESETS: Record<string, Omit<AppContentDoc, 'id'>> = {
  privacy_policy: {
    title: 'Privacy Policy',
    version: '1.0.0',
    lastUpdated: 'July 2026',
    content: `### 1. Introduction
Welcome to Bin Usman. We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.

### 2. Information We Collect
We collect information that you provide directly to us, such as when you create an account, make a booking, list a property, or contact us. This may include:
- **Personal Identifiers**: Name, email address, phone number, and account details.
- **Stay Preferences**: Booking dates, selected apartments, and custom requests.
- **Communication Logs**: Support tickets, inquiries, and application feedback.

### 3. How We Use Your Information
We use the collected information to:
- Provide, maintain, and optimize our property booking services.
- Verify and process lister applications securely.
- Send booking confirmations, stay receipts, and critical account updates.
- Offer round-the-clock personalized customer support.

### 4. Data Protection & Security
We implement high-grade industry-standard physical and digital security protocols to protect your credentials and prevent unauthorized access. We never sell, rent, or trade your personal data with third-party marketers.

### 5. Policy Updates
We reserve the right to modify this Privacy Policy at any time. Any changes will be published immediately on this page with an updated version and last updated date.`
  },
  terms_conditions: {
    title: 'Terms & Conditions',
    version: '1.0.0',
    lastUpdated: 'July 2026',
    content: `### 1. Acceptance of Terms
By accessing or using the Bin Usman application and website, you agree to be bound by these Terms & Conditions. If you do not agree to all of these terms, please do not use our services.

### 2. Booking and Reservations
- **Property Reservations**: Users can browse elite property listings in Pakistan and place stay reservations. All bookings are subject to availability and direct verification.
- **Direct WhatsApp Confirmation**: Booking requests are processed and confirmed directly via our official WhatsApp concierge channel (+923309998917).
- **Cancellation Policy**: Specific cancellation policies are governed by the individual property rules listed on each listing page.

### 3. Lister & Partner Rules
- **Accurate Submissions**: Property owners applying to list their estates must provide 100% accurate, non-misleading photos, prices, cities, and description.
- **Approval Discretion**: Bin Usman reserves the right to approve, reject, or mark as reviewed any lister applications in our absolute discretion.

### 4. Limitation of Liability
Bin Usman acts as a premium lodging platform and is not liable for indirect, incidental, or consequential damages resulting from your stays, check-ins, or property listings.

### 5. Terms Modifications
We reserve the right to modify these terms at any time. Your continued use of the platform constitutes agreement to the updated Terms & Conditions.`
  },
  about_us: {
    title: 'About Us',
    version: '1.0.0',
    lastUpdated: 'July 2026',
    content: `### Discover Bin Usman
Bin Usman is Pakistan's premier luxury lodging and rental platform. We curate the finest and most exclusive properties, apartments, and villas across the nation’s key destinations including Islamabad, Karachi, Lahore, Murree, and Peshawar.

### Our Vision
To redefine luxury living and travel experiences in Pakistan by providing seamless, secure, and unmatched hospitality. Every estate in our collection represents the pinnacle of sophistication, elegance, and comfort.

### Why Choose Us?
- **Handpicked Collections**: Only the most exceptional residences make it to our listing directory.
- **Flawless Support**: Our specialized team is available round-the-clock to assist you with inquiries, custom stays, and lister applications.
- **Trusted Security**: Secure user verification, real-time booking updates, and verified transactions.`
  },
  contact_us: {
    title: 'Contact Us',
    version: '1.0.0',
    lastUpdated: 'July 2026',
    content: `### Get in Touch
Thank you for choosing Bin Usman. Whether you are seeking a magnificent stay, have inquiries about our premium listings, or wish to partner with us, our elite support team is ready to assist you.

### Our Offices
- **Headquarters**: Blue Area, Islamabad, Pakistan
- **Email**: contact@binusman.com
- **Phone**: +92 51 111 876 261
- **Working Hours**: Monday to Saturday, 9:00 AM – 6:00 PM

### Send an Inquiry
Please feel free to reach out directly using the phone or email listed above, or apply through our **List Your Property** portal if you have elite estates you'd like us to feature.`
  }
};

export async function fetchAppContent(docId: string): Promise<AppContentDoc> {
  const docRef = doc(db, 'app_content', docId);
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as AppContentDoc;
    }

    // Document does not exist; automatically create it with default presets
    const preset = DEFAULT_PRESETS[docId];
    if (preset) {
      const newDocData = {
        ...preset,
        createdAt: serverTimestamp(),
      };
      await setDoc(docRef, newDocData);
      return { id: docId, ...preset };
    }

    throw new Error(`Document preset not found for id: ${docId}`);
  } catch (error) {
    console.error(`Error loading app content for ${docId}:`, error);
    handleFirestoreError(error, OperationType.GET, `app_content/${docId}`);
    
    // Return fallback preset if permission or other issues occur so the app never crashes
    const fallback = DEFAULT_PRESETS[docId];
    if (fallback) {
      return { id: docId, ...fallback };
    }
    throw error;
  }
}
