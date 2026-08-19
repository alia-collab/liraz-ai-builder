"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive mx-auto" aria-hidden="true" />
        <h1 className="text-4xl font-bold">500</h1>
        <p className="text-muted-foreground">Something went wrong. Please try again.</p>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-xs text-start bg-muted p-4 rounded max-w-md overflow-auto">{error.message}</pre>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={reset}>Try Again</Button>
          <Button variant="brand" asChild>
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
