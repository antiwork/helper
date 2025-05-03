# Deployment Guide

The application is intended to be deployed to [Vercel](https://vercel.com).

> [!CAUTION]
> Self hosting is a work in progress. Please let us know if you find issues or gaps!

1. Fork the repository.
1. Create a Vercel project and import your fork.
1. Connect essential services:
  - PostgreSQL (we recommend [Supabase](https://supabase.com))
  - Redis (we recommend [Upstash](https://upstash.com))
  - Inngest (we recommend [Inngest Cloud](https://www.inngest.com/cloud))
  - S3-compatible storage
1. Set up environment variables for required integrations (see the [README](README.md#quick-start) and [development.md](development.md#optional-integrations) for instructions).

Vercel will automatically build and deploy your fork upon pushing to the main branch.

You can optionally set up preview branches as long as your services support it.

> [!TIP]
> The script in `vercel.json` will automatically seed the database with sample data on preview branches. After that, the database will continue attempting to apply migrations, but it will not clear/re-seed the database. If you want a clean slate on the preview branch without creating a new PR, then you can temporarily modify `build:preview` in `package.json` to include `pnpm db:reset`, commit/push to Github, and then after the Vercel build completes, you can commit/push a revert commit.
