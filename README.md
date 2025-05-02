# Helper

Customer support agents via live chat and email.

## Project Structure

The project contains:

```text
.github
  └─ workflows
      └─ CI with tests, linting, and type checking
packages
  ├─ nextjs
  │   └─ Next.js web application
  ├─ react
  │   └─ React SDK for integrating the chat widget
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
```

## Quick Start

1. Install local Certificate Authority:

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

2. Generate SSL certificates:

```sh
pnpm generate-ssl-certificates
```

3. Seed the database:

```sh
pnpm db:reset
```

4. Start the application:

```sh
pnpm dev
```

Access the application at [helperai.dev](https://helperai.dev)

## License

Helper is licensed under the [MIT License](LICENSE.md).
