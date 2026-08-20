"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { firebaseErrorMessage, getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { completeFirebaseLogin } from "@/lib/firebase/complete-login";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firebaseReady = isFirebaseClientConfigured();

  async function finish() {
    router.push("/onboarding");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseReady) {
      setError("Firebase is not configured yet.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim().toLowerCase(),
        password
      );
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      const idToken = await cred.user.getIdToken(true);
      await completeFirebaseLogin(idToken, name.trim());
      await finish();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-luxury border-0 glass">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-2">
          <Sparkles className="h-8 w-8 text-brand" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">{t("registerTitle")}</CardTitle>
        <CardDescription>{tc("appName")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!firebaseReady && (
          <div className="mb-4 rounded-md bg-destructive/10 text-destructive text-sm p-3" role="alert">
            Firebase עדיין לא מחובר. הוסיפי את מפתחות Firebase ב-Vercel ואז עשי Redeploy.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" variant="brand" disabled={loading || !firebaseReady}>
            {loading ? tc("loading") : tc("register")}
          </Button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">{t("orContinueWith")}</div>
        <GoogleSignInButton label={t("continueWithGoogle")} onSuccess={() => void finish()} onError={setError} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-brand hover:underline">
            {tc("login")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
