/** Public Firebase web config. Safe in the browser. Env vars override if present. */
export const FIREBASE_WEB_CONFIG = {
  apiKey: "AIzaSyB4lFouWGKv0B-GpnQxyX9kDo1eMZFGGRg",
  authDomain: "lirazai.firebaseapp.com",
  projectId: "lirazai",
  storageBucket: "lirazai.firebasestorage.app",
  messagingSenderId: "52811706144",
  appId: "1:52811706144:web:a7b421bde3041ea019b145",
};

export function getFirebaseWebConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || FIREBASE_WEB_CONFIG.apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || FIREBASE_WEB_CONFIG.authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || FIREBASE_WEB_CONFIG.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || FIREBASE_WEB_CONFIG.storageBucket,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_WEB_CONFIG.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || FIREBASE_WEB_CONFIG.appId,
  };
}

export function isFirebaseClientConfigured() {
  const config = getFirebaseWebConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
