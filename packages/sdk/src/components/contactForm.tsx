import React, { useState } from "react";

interface ContactFormProps {
  onSubmit: (email: string, message: string) => Promise<void>;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !message) {
      return;
    }

    setIsSubmitting(true);
    setIsError(false);

    try {
      await onSubmit(email, message);
      setIsSuccess(true);
    } catch (error) {
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="helper-contact-form">
        <div className="helper-contact-form-success" style={{ display: "block" }}>
          <div className="helper-contact-form-success-icon">✓</div>
          <h4>Message sent!</h4>
          <p>Thanks for reaching out. We'll get back to you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="helper-contact-form">
      <div className="helper-contact-form-header">
        <h3>Contact us</h3>
        <p>Send us a message and we'll get back to you.</p>
      </div>
      <form className="helper-contact-form-form" onSubmit={handleSubmit}>
        <div className="helper-contact-form-field">
          <label htmlFor="helper-contact-email">Email address</label>
          <input
            type="email"
            id="helper-contact-email"
            name="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="helper-contact-form-field">
          <label htmlFor="helper-contact-message">Message</label>
          <textarea
            id="helper-contact-message"
            name="message"
            required
            placeholder="How can we help you?"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <button type="submit" className="helper-contact-form-submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send message"}
        </button>
      </form>
      {isError && (
        <div className="helper-contact-form-error" style={{ display: "block" }}>
          <p>Sorry, there was an error sending your message. Please try again.</p>
        </div>
      )}
    </div>
  );
}
