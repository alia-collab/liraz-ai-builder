import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, BookOpen } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Help Center</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <BookOpen className="h-8 w-8 text-brand mb-2" />
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Learn how to create your first project with AI and publish it.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/onboarding">Create Project</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <MessageCircle className="h-8 w-8 text-brand mb-2" />
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Need help? Our support team is here for you.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/support">Open Ticket</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
