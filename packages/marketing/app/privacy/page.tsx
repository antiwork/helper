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
        <h1 className="text-center text-xl">Privacy Policy</h1>
        <div className="w-24 shrink-0" />
      </header>
      <main className="container mx-auto mb-12 max-w-3xl space-y-8 px-4">
        <h2 className="text-lg">Effective Date: 06 May 2024</h2>
        <section className="text-lg">
          <h3>Introduction</h3>
          Helper is committed to protecting the privacy and security of our users. This Privacy Policy describes how we
          collect, use, share, and secure the personal information you provide. It also describes your choices regarding
          use, access, and correction of your personal data.
        </section>
        <section className="text-lg">
          <h3>Scope of Privacy Policy</h3>
          This Privacy Policy applies to the information that we obtain through your use of &quot;Helper&quot; services
          via a Device or when you otherwise interact with us.
        </section>
        <section className="text-lg">
          <h3>Data Collection and Use</h3>
          Helper accesses your Gmail account data via Google APIs under the following scopes:
          <ul>
            <li>
              <code>https://www.googleapis.com/auth/gmail.modify</code>: Allows Helper to read, compose, send, and
              permanently delete all your emails from Gmail.
            </li>
          </ul>
          We use this access to fetch emails related to customer support inquiries and to allow our AI to draft
          responses. Emails fetched and drafts created are used solely for the purpose of enhancing your customer
          support capabilities. Helper does not use the data obtained through Google Workspace APIs to develop, improve,
          or train generalized AI or ML models.
        </section>
        <section className="text-lg">
          <h3>Data Storage and Sharing</h3>
          Data fetched from Gmail is stored securely on our servers to enable ongoing support and functionality of
          Helper. We do not share your email data with any third parties, except as necessary to provide the
          functionalities of Helper or as required by law.
        </section>
        <section className="text-lg">
          <h3>Data Security</h3>
          We implement a variety of security measures to maintain the safety of your personal information when you
          enter, submit, or access your personal information.
        </section>
        <section className="text-lg">
          <h3>Data Retention</h3>
          We store your personal information for a period of time that is consistent with our business purposes. We will
          retain your personal information for the length of time needed to fulfill the purposes outlined in this
          privacy policy unless a longer retention period is required or permitted by law. When the data retention
          period expires for a given type of data, we will delete or destroy it. You may request for your data to be
          deleted by contacting us via the provided email.
        </section>
        <section className="text-lg">
          <h3>Changes to This Privacy Policy</h3>
          We may update this Privacy Policy to reflect changes to our information practices. If we make any material
          changes, we will notify you by email (sent to the e-mail address specified in your account) or by means of a
          notice on this Service prior to the change becoming effective. We encourage you to periodically review this
          page for the latest information on our privacy practices.
        </section>
      </main>
    </div>
  );
}
