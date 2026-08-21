/** Public Firebase web config. Safe in the browser. */
export const FIREBASE_WEB_CONFIG = {
  apiKey: "AIzaSyB4lFouWGKv0B-GpnQxyX9kDo1eMZFGGRg",
  authDomain: "lirazai.firebaseapp.com",
  projectId: "lirazai",
  storageBucket: "lirazai.firebasestorage.app",
  messagingSenderId: "52811706144",
  appId: "1:52811706144:web:a7b421bde3041ea019b145",
};

export function getFirebaseWebConfig() {
  return { ...FIREBASE_WEB_CONFIG };
}

export function isFirebaseClientConfigured() {
  const config = getFirebaseWebConfig();
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
