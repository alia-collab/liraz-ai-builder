"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Key } from "lucide-react";

export default function SecurityPage() {
  const [mfaEnabled, setMfaEnabled] = useState(false);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">Account Security</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication (MFA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security. Required for admin accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            MFA setup requires ENCRYPTION_KEY in environment. TOTP-based authentication will be enabled here.
          </p>
          <Button
            variant={mfaEnabled ? "destructive" : "brand"}
            onClick={() => setMfaEnabled(!mfaEnabled)}
          >
            {mfaEnabled ? "Disable MFA" : "Enable MFA"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Active Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Session management and remote logout will appear here once connected to the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
