# Marketing Package

This is the marketing website and documentation for Helper.

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The development server will run on http://localhost:3011.

## Environment Variables

To enable the contact form functionality, you need to set up the following environment variables:

### Required for Contact Form

- `RESEND_API_KEY`: Your Resend API key from https://resend.com
- `RESEND_FROM_ADDRESS`: Email address to send from (must be from a verified domain)
- `CONTACT_FORM_TO_ADDRESS`: Email address to receive contact form submissions (defaults to sales@helper.ai)

Create a `.env.local` file in this directory with these variables for local development, or set them in your deployment environment.

Example `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_ADDRESS="Helper Sales" <noreply@yourcompany.com>
CONTACT_FORM_TO_ADDRESS=sales@yourcompany.com
```
