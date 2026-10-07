import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  UserCredential 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 
              (import.meta.env.VITE_FIREBASE_PROJECT_ID ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` : ''),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 
                 (import.meta.env.VITE_FIREBASE_PROJECT_ID ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com` : ''),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseAuthConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  !firebaseConfig.apiKey.includes('YOUR_')
);

// Initialize Firebase App safely
let app: any = null;
let auth: any = null;
let googleProvider: any = null;

try {
  if (isFirebaseAuthConfigured) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
} catch (err) {
  console.warn('[Firebase] Auth initialization notice:', err);
}

export { app, auth, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult };

/**
 * Perform Firebase Google Sign-In with popup, fallback to redirect if popup is blocked
 */
export async function executeFirebaseGoogleSignIn(): Promise<{ success: boolean; user?: any; error?: string }> {
  console.log('[Firebase Auth] executeFirebaseGoogleSignIn called');
  
  if (!auth || !googleProvider) {
    console.warn('[Firebase Auth] Firebase Auth not configured with valid API keys');
    return { success: false, error: 'Firebase Google Auth is not configured on this instance.' };
  }

  try {
    console.log('[Firebase Auth] Attempting signInWithPopup...');
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    console.log('[Firebase Auth] signInWithPopup success:', result.user?.email);
    return { success: true, user: result.user };
  } catch (popupError: any) {
    console.warn('[Firebase Auth] signInWithPopup failed or blocked:', popupError.code, popupError.message);

    // If popup was blocked or closed by user, attempt fallback to redirect
    if (
      popupError.code === 'auth/popup-blocked' ||
      popupError.code === 'auth/cancelled-popup-request' ||
      popupError.code === 'auth/popup-closed-by-user'
    ) {
      try {
        console.log('[Firebase Auth] Fallback: Attempting signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        return { success: true };
      } catch (redirectError: any) {
        console.error('[Firebase Auth] signInWithRedirect error:', redirectError);
        return { success: false, error: redirectError.message };
      }
    }

    return { success: false, error: popupError.message };
  }
}
