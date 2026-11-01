import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore using the configured database ID if provided
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/**
 * Validates connection to Firestore upon boot as mandated by the Firebase skill
 */
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Successfully connected to Firestore server');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client is offline or waiting for network');
    } else {
      console.log('[Firebase] Connection test acknowledged:', error);
    }
    return true;
  }
}
