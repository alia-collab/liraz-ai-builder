import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaypalSettingsForm } from "./paypal-settings-form";
import { isPaypalConfigured, getPaypalMode } from "@/lib/payments/paypal-client";

export default async function AdminSettingsPage() {
  await requireSuperAdmin();

  const settings = await prisma.systemSetting.findMany({ orderBy: { category: "asc" } });
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">System Settings</h1>
      <p className="text-muted-foreground">
        Brand, pricing, and quotas are stored here — editable without code deploy.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>PayPal (platform billing)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Mode: {getPaypalMode()}</p>
          <p>API credentials: {isPaypalConfigured() ? "set in environment" : "missing — checkout disabled"}</p>
          <p className="text-muted-foreground">
            Live billing is not production-ready until sandbox is tested and PAYPAL_MODE=live with live Client ID/Secret, webhook ID, and plan IDs.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plans, pricing & PayPal plan IDs</CardTitle></CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Run db:seed to populate the default plan.</p>
          ) : (
            <PaypalSettingsForm plans={plans} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>System Settings</CardTitle></CardHeader>
        <CardContent>
          {settings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Run db:seed to populate defaults.</p>
          ) : (
            settings.map((s) => (
              <div key={s.key} className="py-2 border-b last:border-0 text-sm">
                <span className="font-mono text-xs">{s.key}</span>
                <pre className="text-muted-foreground mt-1 overflow-x-auto">{JSON.stringify(s.value, null, 2)}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
