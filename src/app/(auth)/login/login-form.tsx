"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { firebaseErrorMessage, getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";
import { completeFirebaseLogin } from "@/lib/firebase/complete-login";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function LoginForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(true);
  const firebaseReady = isFirebaseClientConfigured();

  useEffect(() => {
    fetch("/api/health/auth")
      .then((res) => res.json())
      .then((data) => setDatabaseReady(Boolean(data.databaseConfigured)))
      .catch(() => {});
  }, []);

  async function finish(created: boolean) {
    router.push(created ? "/onboarding" : callbackUrl);
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
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim().toLowerCase(),
        password
      );
      const idToken = await cred.user.getIdToken();
      const data = await completeFirebaseLogin(idToken);
      await finish(Boolean(data.created));
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
        <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
        <CardDescription>{tc("appName")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!databaseReady && (
          <div className="mb-4 rounded-md bg-destructive/10 text-destructive text-sm p-3" role="alert">
            Google works. The live site still has localhost DATABASE_URL, not Neon.
            Click Save on the Neon URL, then Redeploy without cache.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3" role="alert">
              {error}
            </div>
          )}
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
            <div className="flex justify-between">
              <Label htmlFor="password">{t("password")}</Label>
              <Link href="/forgot-password" className="text-sm text-brand hover:underline">
                {t("forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" variant="brand" disabled={loading || !firebaseReady}>
            {loading ? tc("loading") : tc("login")}
          </Button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">{t("orContinueWith")}</div>
        <GoogleSignInButton
          label={t("continueWithGoogle")}
          onSuccess={(created) => void finish(created)}
          onError={setError}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-brand hover:underline">
            {tc("register")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
