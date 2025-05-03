<p align="center">
  <img src="./public/logo.svg#gh-light-mode-only" alt="Helper logo" width="192" />
  <img src="./public/logo-white.svg#gh-dark-mode-only" alt="Helper logo" width="192" />
</p>
<p align="center">
    <a href="https://helper.ai">helper.ai</a> |
    <a href="https://helper.ai/docs">Docs</a>
</p>

# Helper

Customer support via live chat and email.

Features:

* **AI agent:** Reads your docs to give world-class support for everyday queries.
* **Dashboard:** A fully featured escalation flow for human agents to handle complex cases.
* **Tools:** Enable customers and agents to interact with your systems using natural language.
* **SDK:** Integrate live chat and AI-powered inline assistance into your website in seconds.

## Quick Start

### Install dependencies

You'll need:

* [Docker](https://docs.docker.com/get-docker/)
* [Node.js](https://nodejs.org/en/download/) (see [`.node-version`](.node-version))

### Install local Certificate Authority

```sh
# Install mkcert on macOS
brew install mkcert
brew install nss
```

```sh
# Install mkcert on Windows
# First ensure you have Chocolately installed (https://chocolatey.org/install), then:
choco install mkcert
```

_For other operating systems, see the [mkcert installation guide](https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation)._

### Set up environment variables

> [!TIP]
> If you already have a Vercel project with development environment variables set up, you can skip this step. When you run `pnpm dev` you will be prompted to pull the environment variables from Vercel.

Copy `.env.local.sample` to `.env.local`, then fill in values for:

<details>
<summary>Clerk</summary>

1. Go to [clerk.com](https://clerk.com) and create a new app.
1. Name the app and set login methods to: **Email, Google, Apple, GitHub**.
1. Under "Configure > Email, phone, username", turn on "Personal information > Name"
1. Under "Configure > Organization Management", turn on "Enable organizations"
1. Under "Configure > API Keys", add `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to your `.env.local` file.
1. Under "Users", create a user with email `support@gumroad.com` and password `password`. Optionally create other users, e.g. with your email.
1. Add the user ID(s) to your `.env.local` file as `CLERK_INITIAL_USER_IDS`.
1. Under "Organizations", create a new organization and add your user(s) to the "Members" list.
1. Add the organization ID to your `.env.local` file as `CLERK_INITIAL_ORGANIZATION_ID`.

</details>

<details>
<summary>OpenAI</summary>

1. Create an account at [openai.com](https://openai.com).
1. Create a new API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
1. Add the API key to your `.env.local` file as `OPENAI_API_KEY`.

</details>

<details>
<summary>Ably</summary>

1. Go to [ably.com](https://ably.com) and sign up or log in.
2. Create a new app.
3. Go to the "API Keys" tab for your new app.
4. Copy the API key that has all capabilities enabled (usually the first one).
5. Add the API key to your `.env.local` file as `ABLY_API_KEY`.

</details>

_The app will start with placeholder values for other services - you can follow the instructions in [development.md](docs/services.md#optional-integrations) to enable them later._

### Seed the database with sample data

```sh
pnpm db:reset
```

### Start the application

```sh
pnpm dev
```

Access the application at [helperai.dev](https://helperai.dev) 🚀

## Docs

- [Project structure](docs/OVERVIEW.md)
- [Local development](docs/development.md)
- [Deployment](docs/deployment.md)

## License

Helper is licensed under the [MIT License](LICENSE.md).
