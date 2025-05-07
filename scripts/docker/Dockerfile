FROM node:22

WORKDIR /app
EXPOSE 3010

RUN corepack enable
RUN --mount=type=bind,source=.,target=/app,rw pnpm install

CMD ["pnpm", "with-dev-env", "pnpm", "heroku", "local", "-f", "scripts/Procfile.dev"]
