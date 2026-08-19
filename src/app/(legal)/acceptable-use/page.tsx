import { LegalLayout } from "@/components/legal/legal-layout";

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy">
      <p>You agree not to use Liraz AI Builder to:</p>
      <ul className="list-disc ps-6 space-y-1 mt-4">
        <li>Violate any applicable law or regulation</li>
        <li>Distribute malware, phishing pages, or malicious code</li>
        <li>Harass, threaten, or defame others</li>
        <li>Infringe intellectual property rights</li>
        <li>Attempt unauthorized access to other users&apos; data</li>
        <li>Generate spam or unsolicited communications at scale</li>
        <li>Circumvent usage limits or security measures</li>
        <li>Create content involving illegal goods, hate speech, or exploitation</li>
      </ul>
      <p className="mt-6">Violations may result in account suspension, project removal, and legal action.</p>
    </LegalLayout>
  );
}
