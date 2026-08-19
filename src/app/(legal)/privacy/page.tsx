import { LegalLayout } from "@/components/legal/legal-layout";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>This Privacy Policy describes how Liraz AI Builder collects, uses, and protects your personal information.</p>
      <h2 className="text-xl font-semibold mt-6">1. Information We Collect</h2>
      <ul className="list-disc ps-6 space-y-1">
        <li>Account information: name, email, password (hashed)</li>
        <li>Payment information: processed by PayPal — we do not store card numbers or PayPal passwords</li>
        <li>Usage data: projects, AI requests, deployment logs</li>
        <li>Technical data: IP address, browser type, device information</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6">2. How We Use Information</h2>
      <p>To provide the Service, process payments, improve AI features, send transactional emails, and comply with legal obligations.</p>
      <h2 className="text-xl font-semibold mt-6">3. Data Sharing</h2>
      <p>We share data with payment processors (PayPal), AI providers (when configured), and infrastructure providers. We do not sell personal data.</p>
      <h2 className="text-xl font-semibold mt-6">4. Data Retention</h2>
      <p>Account data is retained while your account is active. Deleted accounts are purged after a configurable retention period.</p>
      <h2 className="text-xl font-semibold mt-6">5. Your Rights</h2>
      <p>You may request access, correction, export, or deletion of your data via account settings or by contacting support.</p>
      <h2 className="text-xl font-semibold mt-6">6. Security</h2>
      <p>We implement encryption, access controls, audit logging, and regular security reviews.</p>
      <h2 className="text-xl font-semibold mt-6">7. Cookies</h2>
      <p>See our Cookie Policy for details on cookies and tracking technologies.</p>
    </LegalLayout>
  );
}
