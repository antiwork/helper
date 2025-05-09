# Local Development Guide

> [!TIP]
> Make sure you follow the Quick Start in the [README](/README.md) first!

## Docker Services

The app uses Docker to run the following services locally:

- PostgreSQL
- Redis
- Inngest
- Minio
- Nginx (allowing you to use the `https://helperai.dev` domain)

`pnpm dev` will automatically start and stop these services, or you can use `pnpm services:start` and `pnpm services:stop` to start and stop them manually.

> [!TIP]
> Nginx will attempt to listen on port 80 and 443, so if you have other containers or services running on those ports you will need to stop them first.

## Database Management

Seed the database with sample data:

```sh
pnpm db:reset
```

Generate/run database migrations:

```sh
# Generate a migration to bring the database schema in sync with the definitions in db/schema
pnpm db:generate

# Apply any new migrations to the database
pnpm db:migrate
```

Note that `pnpm dev` will automatically run migrations, but won't generate them.

## Testing

```sh
# Run all tests
npm test

# Run a specific test file
pnpm test tests/inngest/functions/postEmailToGmail.test.ts
```

## Background Tasks

This project uses [Inngest](https://www.inngest.com/) for background tasks. You can view the dashboard / development server at [http://localhost:8288/](http://localhost:8288/).

## Email Development

While email sending/receiving in a customer's inbox happens through Gmail, all other emails get sent using Resend and are defined at `lib/emails`. To preview an email, you can visit http://localhost:3060. You can also send yourself a preview email using the "Send" button (note that some assets like images may not properly display when sending a preview email during local development).

## SSL certificates

The app uses a local Certificate Authority (CA) to generate SSL certificates for the `https://helperai.dev` domain.

The certificates will be automatically generated when you run `pnpm dev` for the first time, but if you need to regenerate them you can use:

```sh
pnpm generate-ssl-certificates
```

## Optional Integrations

These integrations are optional for local development but required to make Helper work correctly in production:

<details>
<summary>Resend (transactional emails)</summary>

1. Go to [resend.com](https://resend.com) and sign up or log in.
2. Navigate to "API Keys".
3. Click "Create API Key". Give it a name (e.g., "Helper Dev") and grant it "Sending access" permission.
4. Add the API key to your `.env.local` file as `RESEND_API_KEY`.

</details>

<details>
<summary>Google OAuth (sending via Gmail)</summary>

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "Credentials".
4. Click "Create Credentials" and select "OAuth client ID".
5. Choose "Web application" as the application type.
6. Add `https://helperai.dev/api/connect/google/callback` to the "Authorized redirect URIs".
7. Click "Create". You will be shown the Client ID and Client Secret.
8. Add these values to your `.env.local` file as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
9. Navigate to "APIs & Services" > "Library".
10. Search for "Gmail API" and enable it for your project.
11. Navigate to "APIs & Services" > "OAuth consent screen".
12. Configure the consent screen. Under "Data access", add the `.../auth/gmail.send` scope.
13. Add your Google account email address as a Test User under "Audience" while the app is in testing mode.

</details>

<details>
<summary>Google Pub/Sub (receiving from Gmail)</summary>

_This setup allows the app to receive real-time notifications (e.g., new emails) from Gmail during local development._

**1.** Set up and start [Serveo](https://serveo.net), [ngrok](https://ngrok.com/docs/getting-started) or similar to get a public forwarding URL pointing to `localhost:3010`.

**2.** Set up Google Pub/Sub:

- Go to the [Google Cloud Console](https://console.cloud.google.com/) and select the same project used for Google OAuth.
- Navigate to "Pub/Sub" > "Topics".
- Click "Create Topic". Give it a name (e.g., `helper-email-dev`) and click "Create".
- Add the topic name to your `.env.local` file as `GOOGLE_PUBSUB_TOPIC_NAME`.
- Grant the Gmail service account permission to publish to this topic:
  - Go back to the "Topics" list and check the box next to your new topic.
  - Click "Permissions" in the info panel on the right (or click the topic name and go to the Permissions tab).
  - Click "Add Principal".
  - In the "New principals" field, enter `gmail-api-push@system.gserviceaccount.com`.
  - Assign the role "Pub/Sub Publisher".
  - Click "Save".
- Create a service account for the push subscription authentication:
  - Go to "IAM & Admin" > "Service Accounts".
  - Click "Create Service Account".
  - Give it a name (e.g., `pubsub-push-auth-dev`) and an ID. Click "Create and Continue".
  - Grant the service account the "Service Account Token Creator" role (`roles/iam.serviceAccountTokenCreator`). This allows it to generate OIDC tokens for authentication. Click "Continue" and "Done".
  - Add the service account email (e.g., `pubsub-push-auth-dev@<your-project-id>.iam.gserviceaccount.com`) to your `.env.local` file as `GOOGLE_PUBSUB_CLAIM_EMAIL`
- Create the push subscription:
  - Navigate to "Pub/Sub" > "Subscriptions".
  - Click "Create Subscription".
  - Give it an ID (e.g., `helper-email-subscription-dev`).
  - Select the Pub/Sub topic you created earlier (e.g., `helper-email-dev`).
  - Under "Delivery type", select "Push".
  - In the "Endpoint URL" field, enter your forwarding URL followed by the webhook path: `https://<your-forwarding-url>/api/webhooks/gmail` (replace `<your-forwarding-url>` with the URL from step 1).
  - Check the box for "Enable authentication".
  - Select the service account you just created (e.g., `pubsub-push-auth-dev@<your-project-id>.iam.gserviceaccount.com`).
  - Leave other settings as default and click "Create".

Now linking your Gmail account from Settings → Integrations should grant Gmail access and webhooks for new emails should arrive on your local server.

</details>

These integrations are entirely optional but add more functionality to Helper.

<details>
<summary>Slack</summary>

Enables various features including messaging channels when tickets are received, messaging users when tickets are assigned, and an AI agent.

1. Set up and start [Serveo](https://serveo.net), [ngrok](https://ngrok.com/docs/getting-started) or similar to get a public forwarding URL pointing to `localhost:3010`.
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app.
1. Under "Basic Information", find your app credentials.
1. Add the following values to your `.env.local` file:
   - `SLACK_CLIENT_ID`: Client ID from Basic Information
   - `SLACK_CLIENT_SECRET`: Client Secret from Basic Information
   - `SLACK_SIGNING_SECRET`: Signing Secret from Basic Information
1. Under "OAuth & Permissions", add all scopes listed in `lib/slack/constants.ts`
1. Under "Event Subscriptions", add `https://<your-forwarding-url>/api/webhooks/slack/event` as the event request URL
1. Also under "Event Subscriptions", subscribe to the following bot events:
   - `app_mention`
   - `assistant_thread_started`
   - `message.channels`
   - `message.im`
   - `tokens_revoked`
1. Under "Interactivity & Shortcuts", add `https://<your-forwarding-url>/api/webhooks/slack/response` as the interactivity request URL
1. Under "Agents & AI Apps", check "Agent or Assistant"
1. Under "App Home", check "Always Show My Bot as Online"
1. Install the app to your workspace.

</details>

<details>
<summary>GitHub</summary>

Enables creating GitHub issues from tickets and replying to the customer when the issue is closed.

1. Go to [github.com/settings/apps](https://github.com/settings/apps) and click "New GitHub App".
1. Fill in the required fields, including a name for your app.
1. Set the Callback URL to `https://<your-forwarding-url>/api/connect/github/callback`
1. Also set the post-installation Setup URL to `https://<your-forwarding-url>/api/connect/github/callback` and check "Redirect on update"
1. Set the following permissions:
   - Repository permissions:
     - Issues: Read & write
   - Account permissions:
     - Email addresses: Read-only
1. After creating the app, note the App ID and generate a private key.
1. Add the following values to your `.env.local` file:
   - `GITHUB_APP_SLUG`: The slug of your GitHub app (from the URL; it should be a dasherized version of your app's name)
   - `GITHUB_APP_ID`: The App ID found in the app settings
   - `GITHUB_CLIENT_SECRET`: The Client Secret from the app settings
   - `GITHUB_PRIVATE_KEY`: The contents of the private key file you downloaded

</details>

<details>
<summary>Jina</summary>

Enables the widget to read the current page for better AI context.

1. Go to [jina.ai](https://jina.ai) and create an account or log in.
2. Navigate to the API section to generate an API token.
3. Add the token to your `.env.local` file as `JINA_API_TOKEN`.

</details>

<details>
<summary>Firecrawl</summary>

Enables linking an existing knowledge base website for the AI to reference.

1. Go to [firecrawl.dev](https://www.firecrawl.dev) and create an account or log in.
2. Generate an API key from your account settings or dashboard.
3. Add the API key to your `.env.local` file as `FIRECRAWL_API_KEY`.

</details>

<details>
<summary>Asset Proxy</summary>

Enables passing email assets through an intermediate server to increase security.

1. Set up a proxy server with HMAC authentication. Use the following CloudFlare Worker script for reference:

```js
const SECRET_KEY = "<secret key>";
const EXPIRY_TIME = 300; // Signature expiry time in seconds (5 minutes)

async function verifySignature(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const passedSignature = url.searchParams.get("verify");
  const expires = url.searchParams.get("expires");

  if (!targetUrl || !passedSignature || !expires) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  if (now > parseInt(expires, 10)) {
    return false; // Expired request
  }

  // Compute expected HMAC signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const dataToSign = `${targetUrl}:${expires}`;
  const signatureData = encoder.encode(dataToSign);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, signatureData);
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // URL-safe Base64 encoding

  return expectedSignature === passedSignature;
}

export default {
  async fetch(request) {
    if (!(await verifySignature(request))) {
      return new Response("Forbidden: Invalid or expired signature", { status: 403 });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    try {
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
      });

      const newHeaders = new Headers(response.headers);
      const allowedOrigins = ["https://helper.ai", "https://helperai.dev"];
      const origin = request.headers.get("Origin");

      if (allowedOrigins.includes(origin)) {
        newHeaders.set("Access-Control-Allow-Origin", origin);
      }

      newHeaders.set("Access-Control-Allow-Methods", "GET");
      newHeaders.set("Access-Control-Allow-Headers", "*");
      newHeaders.set("X-Proxy-By", "Helper Content Proxy");

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};
```

2. Add the following values to your `.env.local` file:
   - `PROXY_URL`: The URL of your proxy server
   - `PROXY_SECRET_KEY`: The same secret key you set in the script

</details>

<details>
<summary>Sentry</summary>

Enables error reporting and performance tracing.

1. Go to [sentry.io](https://sentry.io) and create an account or log in.
2. Create a new project for a Next.js application.
3. In the project settings, find the DSN (Data Source Name).
4. Add the DSN to your `.env.local` file as `NEXT_PUBLIC_SENTRY_DSN`.

</details>
