import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirebaseWebConfig, isFirebaseClientConfigured } from "@/lib/firebase/web-config";

export { isFirebaseClientConfigured };

export function getFirebaseAuth() {
  if (typeof window === "undefined") {
    throw new Error("Firebase Auth is browser-only");
  }
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const config = getFirebaseWebConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}

export function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export function firebaseErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  const he = typeof document !== "undefined" && document.documentElement.lang === "he";
  switch (code) {
    case "auth/email-already-in-use":
      return he ? "כבר קיים חשבון עם האימייל הזה" : "An account with this email already exists";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return he ? "אימייל או סיסמה שגויים" : "Invalid email or password";
    case "auth/weak-password":
      return he ? "הסיסמה חייבת להיות לפחות 6 תווים" : "Password must be at least 6 characters";
    case "auth/popup-closed-by-user":
      return he ? "ההתחברות עם Google בוטלה" : "Google sign-in was cancelled";
    case "auth/unauthorized-domain":
      return he
        ? "הדומיין לא מורשה ב-Firebase. הוסיפי את lirazai.com ואת localhost ב-Authorized domains."
        : "This domain is not allowed in Firebase. Add lirazai.com and localhost in Firebase authorized domains.";
    case "auth/operation-not-allowed":
      return he
        ? "שיטת ההתחברות הזו כבויה ב-Firebase Console."
        : "This sign-in method is disabled in Firebase Console.";
    default:
      return he ? "ההתחברות נכשלה. נסי שוב." : "Sign-in failed. Try again.";
  }
}
