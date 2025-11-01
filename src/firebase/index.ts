'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// A private, module-level cache for Firebase services.
let services: { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore } | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // If the services are already cached, return them.
  if (services) {
    return services;
  }

  // If no apps are initialized, create a new one. Otherwise, get the existing one.
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  services = getSdks(app);
  
  return services;
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
