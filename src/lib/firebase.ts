import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
} catch (e) {
  try {
    firestoreDb = initializeFirestore(app, { experimentalForceLongPolling: true }, (firebaseConfig as any).firestoreDatabaseId);
  } catch (e2) {
    firestoreDb = getFirestore(app);
  }
}

let storageInstance;
try {
  const rawBucket = (firebaseConfig as any).storageBucket || 'ai-studio-applet-webapp-28603.firebasestorage.app';
  const bucketUrl = rawBucket.startsWith('gs://') ? rawBucket : `gs://${rawBucket}`;
  storageInstance = getStorage(app, bucketUrl);
} catch (e) {
  storageInstance = getStorage(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    // Ignore not-found or permission errors during connection test as the test doc might not exist yet
    if (error?.code === 'not-found' || error?.message?.includes('not-found') || error?.message?.includes('permission-denied') || error?.code === 'unavailable') {
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is operating in offline mode or connecting...");
    }
  }
}

testConnection();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      return null;
    }
    console.error("Error signing in with Google", error);
    throw error;
  }
};
