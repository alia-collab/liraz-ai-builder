import { LegalLayout } from "@/components/legal/legal-layout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>These Terms of Service (&quot;Terms&quot;) govern your use of Liraz AI Builder (&quot;Service&quot;), operated by the platform owner (&quot;we&quot;, &quot;us&quot;).</p>
      <h2 className="text-xl font-semibold mt-6">1. Acceptance</h2>
      <p>By creating an account or using the Service, you agree to these Terms and our Privacy Policy.</p>
      <h2 className="text-xl font-semibold mt-6">2. Service Description</h2>
      <p>The Service allows users to create websites and web applications using AI and visual tools without writing code.</p>
      <h2 className="text-xl font-semibold mt-6">3. Accounts</h2>
      <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
      <h2 className="text-xl font-semibold mt-6">4. Subscriptions & Billing</h2>
      <p>Paid subscriptions renew automatically through PayPal unless canceled. Prices are displayed at checkout and may be updated with notice. Refunds are governed by our Refund Policy. These legal pages are drafts and are not lawyer-approved.</p>
      <h2 className="text-xl font-semibold mt-6">5. Acceptable Use</h2>
      <p>You may not use the Service for illegal activities, malware distribution, harassment, or content prohibited under our Content Policy.</p>
      <h2 className="text-xl font-semibold mt-6">6. Intellectual Property</h2>
      <p>You retain ownership of content you create. We retain rights to the platform, templates, and underlying technology.</p>
      <h2 className="text-xl font-semibold mt-6">7. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from use of the Service.</p>
      <h2 className="text-xl font-semibold mt-6">8. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms. Upon termination, you may export your data during the grace period.</p>
      <h2 className="text-xl font-semibold mt-6">9. Governing Law</h2>
      <p>These Terms shall be governed by applicable local law. Specific jurisdiction to be determined by legal counsel.</p>
    </LegalLayout>
  );
}
