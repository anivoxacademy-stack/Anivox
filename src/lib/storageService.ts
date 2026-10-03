import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage, auth } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface StorageUploadOptions {
  file: File;
  folder: string;
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  onError?: (errorMsg: string, errorCode?: string, rawError?: any) => void;
  onComplete?: (result: {
    downloadUrl: string;
    storagePath: string;
    fileName: string;
    size: number;
    contentType: string;
  }) => void;
}

export interface StorageDiagnosticInfo {
  projectId: string;
  storageBucket: string;
  authenticated: boolean;
  uid: string | null;
  email: string | null;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  errorCode?: string;
  errorMessage?: string;
}

export function getStorageDiagnostic(file: File, folder: string, error?: any): StorageDiagnosticInfo {
  const currentUser = auth.currentUser;
  return {
    projectId: firebaseConfig.projectId,
    storageBucket: (firebaseConfig as any).storageBucket || 'ai-studio-applet-webapp-28603.firebasestorage.app',
    authenticated: Boolean(currentUser),
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || 'application/octet-stream',
    storagePath: `${folder}/${file.name}`,
    errorCode: error?.code,
    errorMessage: error?.message || (error ? String(error) : undefined),
  };
}

export function logStorageDiagnostic(file: File, folder: string, error?: any): void {
  const diag = getStorageDiagnostic(file, folder, error);
  console.group('🔥 Firebase Storage Upload Diagnostic');
  console.log('Project ID:', diag.projectId);
  console.log('Storage Bucket:', diag.storageBucket);
  console.log('Authenticated User:', diag.authenticated ? `${diag.email} (${diag.uid})` : 'NO (Unauthenticated)');
  console.log('File Name:', diag.fileName);
  console.log('File Size:', `${(diag.fileSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log('MIME Type:', diag.contentType);
  console.log('Target Storage Path:', diag.storagePath);
  if (diag.errorCode || diag.errorMessage) {
    console.error('Firebase Storage Error Code:', diag.errorCode);
    console.error('Firebase Storage Error Message:', diag.errorMessage);
  }
  console.groupEnd();
}

/**
 * Centralized production-grade upload helper for Firebase Storage
 */
export async function uploadFileToStorage(options: StorageUploadOptions): Promise<{ uploadTask: UploadTask; cancel: () => void }> {
  const { file, folder, onProgress, onError, onComplete } = options;

  // 1. Check Authentication
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const errorMsg = 'Upload failed: User is not authenticated in Firebase. Please sign in with your account.';
    logStorageDiagnostic(file, folder, { code: 'storage/unauthenticated', message: errorMsg });
    if (onError) onError(errorMsg, 'storage/unauthenticated');
    throw new Error(errorMsg);
  }

  // 2. Force refresh Firebase Auth ID token so updated custom admin claims are included in headers
  try {
    await currentUser.getIdToken(true);
  } catch (tokenErr: any) {
    console.warn('Notice refreshing Firebase Auth ID token before storage upload:', tokenErr?.message || tokenErr);
  }

  // 3. Prepare storage path
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `${folder}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
        uploadedBy: currentUser.uid,
        uploadedByEmail: currentUser.email || '',
      }
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(pct, snapshot.bytesTransferred, snapshot.totalBytes);
        } else if (onProgress) {
          onProgress(0, 0, 0);
        }
      },
      (err: any) => {
        logStorageDiagnostic(file, folder, err);

        let friendlyDetail = '';
        if (err?.code === 'storage/unauthorized') {
          friendlyDetail = 'Permission denied. You must be an authorized administrator to upload to this location.';
        } else if (err?.code === 'storage/unauthenticated') {
          friendlyDetail = 'User is not authenticated. Please sign in again.';
        } else if (err?.code === 'storage/bucket-not-found') {
          friendlyDetail = 'Storage bucket not found. Please verify Firebase project configuration.';
        } else if (err?.code === 'storage/quota-exceeded') {
          friendlyDetail = 'Firebase Storage quota exceeded.';
        } else if (err?.code === 'storage/canceled') {
          friendlyDetail = 'Upload was canceled.';
        } else if (err?.code === 'storage/retry-limit-exceeded') {
          friendlyDetail = 'Upload network retry limit exceeded. Please check your internet connection.';
        } else {
          friendlyDetail = err?.message || 'An unexpected storage error occurred.';
        }

        const codeSuffix = err?.code ? ` (${err.code})` : '';
        const fullMessage = `Upload failed: ${friendlyDetail}${codeSuffix}`;
        if (onError) onError(fullMessage, err?.code, err);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onComplete) {
            onComplete({
              downloadUrl,
              storagePath,
              fileName: file.name,
              size: file.size,
              contentType: file.type || 'application/octet-stream',
            });
          }
        } catch (fetchErr: any) {
          console.error('Error retrieving download URL:', fetchErr);
          const msg = `Failed to retrieve download URL: ${fetchErr?.message || fetchErr}`;
          if (onError) onError(msg, 'storage/url-fetch-error', fetchErr);
        }
      }
    );

    return {
      uploadTask,
      cancel: () => {
        try {
          uploadTask.cancel();
        } catch (e) {
          console.warn('Notice canceling upload:', e);
        }
      }
    };
  } catch (initErr: any) {
    logStorageDiagnostic(file, folder, initErr);
    const msg = `Upload initialization failed: ${initErr?.message || initErr}`;
    if (onError) onError(msg, initErr?.code || 'storage/init-error', initErr);
    throw initErr;
  }
}
