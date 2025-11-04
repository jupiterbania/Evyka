'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  FirestoreError,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from './errors';

function isPermissionError(error: any): error is FirestoreError {
    return error.code === 'permission-denied';
}

/**
 * Initiates a setDoc operation for a document reference.
 * Catches permission errors and emits a detailed custom error.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  const promise = options ? setDoc(docRef, data, options) : setDoc(docRef, data);
  promise.catch(error => {
    if (isPermissionError(error)) {
        const customError = new FirestorePermissionError(options?.merge ? 'merge' : 'set', docRef.path, data, error);
        errorEmitter.emit('permission-error', customError);
    } else {
        console.error("Error in non-blocking setDoc:", error);
    }
  })
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Catches permission errors and emits a detailed custom error.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const promise = addDoc(colRef, data)
    .catch(error => {
      if (isPermissionError(error)) {
        const customError = new FirestorePermissionError('add', colRef.path, data, error);
        errorEmitter.emit('permission-error', customError);
      } else {
        console.error("Error in non-blocking addDoc:", error);
      }
    });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Catches permission errors and emits a detailed custom error.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      if (isPermissionError(error)) {
          const customError = new FirestorePermissionError('update', docRef.path, data, error);
          errorEmitter.emit('permission-error', customError);
      } else {
        console.error("Error in non-blocking updateDoc:", error);
      }
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Catches permission errors and emits a detailed custom error.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      if (isPermissionError(error)) {
        const customError = new FirestorePermissionError('delete', docRef.path, {}, error);
        errorEmitter.emit('permission-error', customError);
      } else {
        console.error("Error in non-blocking deleteDoc:", error);
      }
    });
}
