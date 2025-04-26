# Helper

Customer support agents via live chat and email.

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
bin/generate_ssl_certificates
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
