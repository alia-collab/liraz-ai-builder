import { LegalLayout } from "@/components/legal/legal-layout";

export default function DpaPage() {
  return (
    <LegalLayout title="Data Processing Agreement (DPA)">
      <p>This Data Processing Agreement applies when we process personal data on your behalf as a data processor under applicable privacy laws (e.g., GDPR).</p>
      <h2 className="text-xl font-semibold mt-6">1. Scope</h2>
      <p>This DPA applies to business customers who use the Service to process personal data of their end users.</p>
      <h2 className="text-xl font-semibold mt-6">2. Processing Instructions</h2>
      <p>We process personal data only according to your documented instructions and this agreement.</p>
      <h2 className="text-xl font-semibold mt-6">3. Security Measures</h2>
      <p>We implement appropriate technical and organizational measures including encryption, access controls, and audit logging.</p>
      <h2 className="text-xl font-semibold mt-6">4. Sub-processors</h2>
      <p>We use sub-processors for hosting, payments, and AI services. A current list is available upon request.</p>
      <h2 className="text-xl font-semibold mt-6">5. Data Subject Rights</h2>
      <p>We assist you in responding to data subject requests within reasonable timeframes.</p>
      <h2 className="text-xl font-semibold mt-6">6. Breach Notification</h2>
      <p>We will notify you without undue delay upon becoming aware of a personal data breach.</p>
    </LegalLayout>
  );
}
