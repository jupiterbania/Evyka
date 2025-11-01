'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// A single, module-level instance of the Firebase app.
let firebaseApp: FirebaseApp;

/**
 * Initializes and/or returns the singleton Firebase app instance.
 * This function ensures Firebase is initialized with the proper configuration,
 * but only once, preventing re-initialization errors.
 */
function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    // No app has been initialized yet, so initialize it with the config.
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    // An app is already initialized, so get that instance.
    firebaseApp = getApp();
  }
  return firebaseApp;
}

/**
 * This is the primary function to get all necessary Firebase services.
 * It ensures the Firebase app is initialized before getting the services.
 * This function is designed to be called from the `FirebaseClientProvider`.
 */
export function initializeFirebase() {
  const app = getFirebaseApp();
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

// Re-exporting other modules for convenient access throughout the app.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
