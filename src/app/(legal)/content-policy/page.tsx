import { LegalLayout } from "@/components/legal/legal-layout";

export default function ContentPolicyPage() {
  return (
    <LegalLayout title="Content Policy">
      <p>All content created and published through the platform must comply with this policy.</p>
      <h2 className="text-xl font-semibold mt-6">Prohibited Content</h2>
      <ul className="list-disc ps-6 space-y-1">
        <li>Illegal content or activities</li>
        <li>Child exploitation or abuse material</li>
        <li>Violent extremism or terrorism promotion</li>
        <li>Non-consensual intimate imagery</li>
        <li>Fraudulent schemes or deceptive practices</li>
        <li>Counterfeit goods or unauthorized replicas</li>
      </ul>
      <h2 className="text-xl font-semibold mt-6">AI-Generated Content</h2>
      <p>You are responsible for reviewing AI-generated content before publishing. We implement safety filters but cannot guarantee perfection.</p>
      <h2 className="text-xl font-semibold mt-6">Reporting</h2>
      <p>Report violations via our support channel. We review reports and may remove content or suspend accounts.</p>
    </LegalLayout>
  );
}
