import { createRemoteJWKSet, jwtVerify } from "jose";
import { FIREBASE_WEB_CONFIG } from "@/lib/firebase/web-config";

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export function getFirebaseProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    FIREBASE_WEB_CONFIG.projectId
  );
}

export function isFirebaseAdminConfigured() {
  return Boolean(getFirebaseProjectId());
}

export type FirebaseIdToken = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdToken> {
  const projectId = getFirebaseProjectId();
  if (!projectId) {
    throw new Error("Firebase is not configured");
  }

  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid) {
    throw new Error("Invalid Firebase token");
  }

  return {
    uid,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    email_verified: Boolean(payload.email_verified),
  };
}
