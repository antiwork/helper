# Helper

In-app customer support center + live chat powered by API.

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

### Seed the database with sample data

```sh
pnpm db:reset
```

### Start the application

```sh
pnpm dev
```

Access the application at [helperai.dev](https://helperai.dev) 🚀

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fantiwork%2Fhelper&env=OPENAI_API_KEY&envDescription=See%20our%20deployment%20guide%20for%20details.&envLink=https%3A%2F%2Fhelper.ai%2Fdocs%2Fdeployment&project-name=helper&repository-name=helper&integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6)

## Docs

- [Project structure](https://helper.ai/docs/development/overview)
- [Local development](https://helper.ai/docs/development)
- [Deployment](https://helper.ai/docs/deployment)

## License

Helper is licensed under the [MIT License](LICENSE.md).
