"use client";

import { LegalLayout } from "@/components/legal/legal-layout";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function CookiesPage() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  return (
    <LegalLayout title="Cookie Settings">
      <p>We use essential cookies for authentication and session management. Optional cookies require your consent.</p>
      <div className="space-y-4 mt-6 not-prose">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Essential</p>
            <p className="text-sm text-muted-foreground">Required for login and security. Always active.</p>
          </div>
          <span className="text-sm text-muted-foreground">Always on</span>
        </div>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Analytics</p>
            <p className="text-sm text-muted-foreground">Help us understand usage patterns.</p>
          </div>
          <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} aria-label="Analytics cookies" />
        </div>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Marketing</p>
            <p className="text-sm text-muted-foreground">Personalized content and ads.</p>
          </div>
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} aria-label="Marketing cookies" />
        </div>
        <Button variant="brand" onClick={() => localStorage.setItem("cookie_prefs", JSON.stringify({ analytics, marketing }))}>
          Save Preferences
        </Button>
      </div>
    </LegalLayout>
  );
}
