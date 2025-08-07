import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="h-full overflow-y-auto">
      <header className="mb-12 flex items-center justify-between gap-2 border-b border-border bg-secondary p-4">
        <div className="w-24 shrink-0">
          <Link href="/">
            <Button variant="subtle">← Back</Button>
          </Link>
        </div>
        <h1 className="text-center text-xl">Terms of Service</h1>
        <div className="w-24 shrink-0" />
      </header>
      <main className="container mx-auto mb-12 max-w-3xl space-y-8 px-4">
        <h2 className="text-lg">Effective Date: 06 May 2024</h2>
        <section className="text-lg">
          <h3>1. Acceptance of Terms</h3>
          Welcome to Helper! By accessing or using our AI-powered email customer support services, you agree to be bound
          by these terms and conditions (the &quot;Terms&quot;). If you do not agree with all of these Terms, you are
          prohibited from using or accessing this service.
        </section>
        <section className="text-lg">
          <h3>2. Description of Service</h3>
          Helper provides an AI-powered service that interfaces with your Gmail account to streamline and enhance
          customer support interactions. Our services allow for automated reading, drafting, and managing of emails
          related to customer inquiries.
        </section>
        <section className="text-lg">
          <h3>3. Privacy Policy</h3>
          Our use of personal information is described in our <Link href="/privacy">Privacy Policy</Link>. By using
          Helper, you acknowledge and agree that we may process your data in accordance with these terms.
        </section>
        <section className="text-lg">
          <h3>4. User Obligations</h3>
          You agree to use Helper only for lawful purposes and in a manner that does not infringe the rights of,
          restrict, or inhibit anyone else&apos;s use and enjoyment of the service. Prohibited behavior includes
          harassing or causing distress or inconvenience to any person, transmitting obscene or offensive content, or
          disrupting the normal flow of dialogue within our services.
        </section>
        <section className="text-lg">
          <h3>5. Intellectual Property</h3>
          All content included on Helper, such as text, graphics, logos, images, as well as the compilation thereof, and
          any software used on the site, is the property of Helper or its suppliers and protected by copyright and
          intellectual property laws.
        </section>
        <section className="text-lg">
          <h3>6. Termination and Access Restriction</h3>
          Helper reserves the right, in its sole discretion, to terminate your access to the service or any portion
          thereof at any time, without notice, for any reason whatsoever.
        </section>
        <section className="text-lg">
          <h3>7. Links to Third Party Sites</h3>
          Helper may contain links to other websites (&quot;Linked Sites&quot;). The Linked Sites are not under the
          control of Helper and we are not responsible for the contents of any Linked Site, including without limitation
          any link contained in a Linked Site, or any changes or updates to a Linked Site.
        </section>
        <section className="text-lg">
          <h3>8. Disclaimer of Warranties</h3>
          You understand and agree that your use of Helper is at your sole risk. The service is provided on an &quot;AS
          IS&quot; and &quot;AS AVAILABLE&quot; basis. Helper expressly disclaims all warranties of any kind, whether
          express or implied, including, but not limited to, the implied warranties of merchantability, fitness for a
          particular purpose, and non-infringement.
        </section>
        <section className="text-lg">
          <h3>9. Limitation of Liability</h3>
          In no event shall Helper be liable for any direct, indirect, incidental, special, consequential, or exemplary
          damages, including but not limited to, damages for loss of profits, goodwill, use, data or other intangible
          losses (even if Helper has been advised of the possibility of such damages).
        </section>
        <section className="text-lg">
          <h3>10. Indemnification</h3>
          You agree to indemnify and hold Helper, its parents, subsidiaries, affiliates, officers, and employees
          harmless from any claim or demand, including reasonable attorneys&apos; fees, made by any third party due to
          or arising out of your use of the service, your violation of these Terms, or your violation of any rights of
          another.
        </section>
        <section className="text-lg">
          <h3>11. Modification of Terms</h3>
          Helper reserves the right to change these Terms at any time by posting the modified Terms on the Helper site.
          Your continued use of the service after such modifications will constitute your: (a) acknowledgment of the
          modified Terms; and (b) agreement to abide and be bound by the modified Terms.
        </section>
        <section className="text-lg">
          <h3>12. Dispute Resolution</h3>
          Any disputes arising out of or related to these Terms shall be governed by and construed in accordance with
          the laws of [Jurisdiction], without regard to its conflict of law principles.
        </section>
      </main>
    </div>
  );
}
