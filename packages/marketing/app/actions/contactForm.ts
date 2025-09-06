"use server";

import { Resend } from "resend";

interface ContactFormData {
  name: string;
  email: string;
  employees: string;
  tickets: string;
  issues?: string;
}

export async function sendContactEmail(formData: FormData) {
  try {
    const data: ContactFormData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      employees: formData.get("employees") as string,
      tickets: formData.get("tickets") as string,
      issues: (formData.get("issues") as string) || "",
    };

    if (!data.name || !data.email || !data.employees || !data.tickets) {
      return {
        success: false,
        error: "All required fields must be filled",
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = process.env.RESEND_FROM_ADDRESS;
    const toAddress = process.env.CONTACT_FORM_TO_ADDRESS;

    if (!resendApiKey || !fromAddress || !toAddress) {
      console.error("Email service environment variables are not set");
      return {
        success: false,
        error: "Email service is not configured",
      };
    }

    const resend = new Resend(resendApiKey);

    const emailSubject = `New Contact Form Submission from ${data.name}`;
    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Number of employees:</strong> ${data.employees}</p>
      <p><strong>Monthly support tickets:</strong> ${data.tickets}</p>
      ${data.issues ? `<p><strong>Common support issues:</strong><br>${data.issues.replace(/\n/g, "<br>")}</p>` : ""}
      <hr>
      <p><em>Submitted at: ${new Date().toISOString()}</em></p>
    `;

    const emailText = `
      New Contact Form Submission
      
      Name: ${data.name}
      Email: ${data.email}
      Number of employees: ${data.employees}
      Monthly support tickets: ${data.tickets}
      ${data.issues ? `Common support issues: ${data.issues}` : ""}
      
      Submitted at: ${new Date().toISOString()}
    `;

    const result = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return {
        success: false,
        error: "Failed to send email",
      };
    }

    console.log("Contact form email sent successfully:", result.data?.id);

    return {
      success: true,
      message: "Your message has been sent successfully! We'll get back to you soon.",
    };
  } catch (error) {
    console.error("Contact form submission error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
