import { LegalLayout } from "@/components/legal/legal-layout";

export default function RefundPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy">
      <h2 className="text-xl font-semibold">Free Trial</h2>
      <p>New subscribers receive a free trial period (configurable, default 14 days). You will not be charged until the trial ends unless you cancel before then.</p>
      <h2 className="text-xl font-semibold mt-6">Cancellation</h2>
      <p>You may cancel your subscription at any time from Billing (which cancels the PayPal subscription) or from your PayPal account. Cancellation is confirmed only after PayPal reports the subscription as cancelled.</p>
      <h2 className="text-xl font-semibold mt-6">After Cancellation</h2>
      <p>Projects enter read-only mode for a grace period (default 30 days). You may export data or resubscribe during this period.</p>
      <h2 className="text-xl font-semibold mt-6">Refunds</h2>
      <p>Monthly subscriptions: no refunds for partial months unless required by law. Yearly subscriptions (billed as 12 months): pro-rata refunds may be considered within 14 days of purchase via PayPal. Contact support. Refunds are processed by PayPal when issued.</p>
      <h2 className="text-xl font-semibold mt-6">Failed Payments</h2>
      <p>If payment fails, we will retry and notify you. After repeated failures, your account may enter read-only mode.</p>
    </LegalLayout>
  );
}
