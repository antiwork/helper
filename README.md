# Helper

Customer support agents via live chat and email.

## Project Structure

The project uses [Turborepo](https://turbo.build/) and contains:

```text
.github
  └─ workflows
      └─ CI with tests, linting, and type checking
apps
  ├─ nextjs
  │   └─ Next.js web application
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

Open **PowerShell as Administrator** and run:

powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

Then:
powershell
choco install mkcert
mkcert -install

If Chocolatey installation fails due to an existing incomplete setup, delete `C:\ProgramData\chocolatey` manually and rerun the script above.
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

Helper is licensed under the [MIT License](LICENSE.md).