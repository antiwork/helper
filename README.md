# Helper

Helper is an open-source AI-powered customer support automation platform. It helps you manage customer support across email and chat with powerful AI assistance.

## Features

- 📧 Email Integration: Connect your Gmail account to manage customer support emails
- 💬 Chat Integration: Seamless Slack integration for team collaboration
- 🤖 AI Assistance: Intelligent response suggestions and automation
- 📱 Cross-Platform: Web, desktop (macOS, Windows, Linux), and mobile apps (iOS, Android)
- 🔄 Real-time Sync: Instant synchronization across all platforms
- 🎨 Modern UI: Beautiful and intuitive user interface

## Documentation

- [Local Development Guide](docs/development.md)
- [Mobile App Development](docs/mobile.md)
- [Desktop App Development](docs/desktop.md)
- [Integrations Guide](docs/integrations.md)
- [Deployment Guide](docs/deployment.md)
- [AI Evaluation Guide](docs/evaluation.md)

## Project Structure

The project uses [Turborepo](https://turbo.build/) and contains:

```text
.github
  └─ workflows
      └─ CI with tests, linting, and type checking
apps
  ├─ expo
  │   └─ Mobile app using Expo + NativeWind
  ├─ nextjs
  │   └─ Next.js web application
  └─ tauri
      └─ Desktop app using Tauri (Rust-based)
bin
  └─ Development and deployment scripts
docker
  └─ Local development environment configs
docs
  └─ Project documentation
packages
  └─ react
      └─ Shared React components and hooks
supabase
  └─ Database configurations
tooling
  ├─ eslint
  │   └─ Shared ESLint config
  ├─ tailwind
  │   └─ Shared Tailwind config
  └─ typescript
      └─ Shared TypeScript config
```

## Quick Start

1. Install local Certificate Authority:

```sh
# Install mkcert on macOS
brew install mkcert
brew install nss
```

_For other operating systems, see the [mkcert installation guide](https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation)._

2. Generate SSL certificates:

```sh
# Generate SSL certificates
bin/generate_ssl_certs
```

3. Start the application:

```sh
bin/dev
```

Access the application at [helperai.dev](https://helperai.dev)

4. Seed the database:

```sh
npm run db:reset
```

Sample credentials:

- `support@gumroad.com` / `password`
- `user1,...,user4@gumroad.com` / `password`

5. Generate and run database migrations:

```sh
npm run db:generate
npm run db:migrate
```

## License

You may self-host Helper for free, if (1) your business has less than 1 million USD total revenue in the prior tax year, and less than 10 million USD GMV (Gross Merchandise Value), or (2) you are a non-profit organization or government entity. For more details, see the [Helper Community License 1.0](LICENSE.md)
