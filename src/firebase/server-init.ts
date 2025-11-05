import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './config';

// This file is for SERVER-SIDE firebase initialization only.

let firebaseApp: FirebaseApp;

/**
 * Initializes and/or returns the singleton Firebase app instance for server-side use.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}
