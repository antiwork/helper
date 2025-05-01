# Deployment Guide

## Preview Branches

Vercel automatically builds and deploys a preview branch for each pull request. Some things to note:

- To test Google/Slack features (login, sending emails), you must manually configure Google Cloud and Slack to point to the preview branch URL.
- When the preview branch is first created, the database will be automatically seeded with sample data. After that, the database will continue attempting to apply migrations, but it will not clear/re-seed the database. If you want a clean slate on the preview branch without creating a new PR, then you can temporarily modify `build:preview` in `packages/nextjs/package.json` to include `pnpm db:reset`, commit/push to Github, and then after the Vercel build completes, you can commit/push a revert commit.

## Production Deployment

Vercel auto-deploys the application upon merging commits to main.
