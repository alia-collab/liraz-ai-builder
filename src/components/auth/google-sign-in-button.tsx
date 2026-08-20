"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { firebaseErrorMessage, getFirebaseAuth, googleProvider, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { completeFirebaseLogin } from "@/lib/firebase/complete-login";

export function GoogleSignInButton({
  onSuccess,
  onError,
  label = "Continue with Google",
}: {
  onSuccess: (created: boolean) => void;
  onError: (message: string) => void;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  if (!isFirebaseClientConfigured()) return null;

  async function handleClick() {
    setLoading(true);
    try {
      const result = await signInWithPopup(getFirebaseAuth(), googleProvider());
      const idToken = await result.user.getIdToken();
      const data = await completeFirebaseLogin(idToken);
      onSuccess(Boolean(data.created));
    } catch (error) {
      onError(firebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? "..." : label}
    </Button>
  );
}
