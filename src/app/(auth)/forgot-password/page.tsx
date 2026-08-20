"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { sendPasswordResetEmail } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { firebaseErrorMessage, getFirebaseAuth, isFirebaseClientConfigured } from "@/lib/firebase/client";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const firebaseReady = isFirebaseClientConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseReady) {
      setError("Firebase is not configured yet.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("forgotPassword")}</CardTitle>
        <CardDescription>
          {sent
            ? "If an account exists, we sent reset instructions to your email."
            : "Enter your email and we'll send reset instructions."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 text-destructive text-sm p-3" role="alert">
            {error}
          </div>
        )}
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" variant="brand" disabled={loading || !firebaseReady}>
              {loading ? tc("loading") : "Send Reset Link"}
            </Button>
          </form>
        ) : (
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">{tc("login")}</Link>
          </Button>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-brand hover:underline">
            {tc("back")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
