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

- **AI agent:** Reads your docs to give world-class support for everyday queries.
- **Dashboard:** A fully featured escalation flow for human agents to handle complex cases.
- **Tools:** Enable customers and agents to interact with your systems using natural language.
- **SDK:** Integrate live chat and AI-powered inline assistance into your website in seconds.

## Quick Start

### Install dependencies

You'll need:

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/en/download/) (see [`.node-version`](.node-version))

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
<summary>OpenAI</summary>

1. Create an account at [openai.com](https://openai.com).
1. Create a new API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
1. Add the API key to your `.env.local` file as `OPENAI_API_KEY`.

</details>

_The app will start with placeholder values for other services - you can follow the instructions in the [development guide](https://helper.ai/docs/development#optional-integrations) to enable them later._

### Install dependencies

```sh
pnpm install
```

### Generate the SSL certificates

```sh
pnpm generate-ssl-certificates
```

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

- [Project structure](https://helper.ai/docs/development/overview)
- [Local development](https://helper.ai/docs/development)
- [Deployment](https://helper.ai/docs/deployment)

## License

Helper is licensed under the [MIT License](LICENSE.md).
