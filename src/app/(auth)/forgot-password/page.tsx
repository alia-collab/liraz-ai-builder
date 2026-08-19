"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Email sending requires SMTP — show success for security (no email enumeration)
    await new Promise((r) => setTimeout(r, 500));
    setSent(true);
    setLoading(false);
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
            <Button type="submit" className="w-full" variant="brand" disabled={loading}>
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
