/**
 * Defines a custom error type for Firestore permission-denied errors.
 * This class encapsulates detailed context about the failed operation,
 * which is crucial for debugging security rule violations.
 */
export class FirestorePermissionError extends Error {
  /** The Firestore operation that was attempted (e.g., 'get', 'set', 'update', 'delete'). */
  public operation: string;

  /** The path to the Firestore document or collection. */
  public path: string;

  /** The data that was being sent to Firestore. */
  public resource: unknown;

  constructor(
    operation: string,
    path: string,
    resource: unknown,
    originalError?: Error
  ) {
    // Construct the error message
    const message = `Firestore Permission Denied: Cannot ${operation} on ${path}.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.operation = operation;
    this.path = path;
    this.resource = resource;

    // Preserve the original stack trace if available
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}
