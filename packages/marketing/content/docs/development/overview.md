---
title: Codebase Overview
---

This document provides a high-level overview of the Helper codebase architecture, designed to help new developers understand the structure and contribute effectively. It covers key components, their interactions, and important concepts to grasp.

## Core Functionality

Helper is an AI-powered customer support tool that helps businesses automate and improve their support workflows. Its core functionalities include:

- **Email Integration:** Connects to Gmail accounts to fetch and process customer support emails.
- **AI-Driven Responses:** Generates draft responses to customer emails using AI, leveraging past conversations, FAQs, and other context.
- **Chat Widget:** Provides a customizable chat widget that can be embedded on websites to allow customers to directly interact with the AI assistant.
- **Analytics and Reporting:** Offers dashboards and reports to track key metrics like response times, customer satisfaction, and agent performance.

## Codebase Structure

The codebase is Next.js app which also contains individual SDK packages.

### Key Directories and Their Purpose

- **`app`:** Contains the Next.js application's routes and components. This is where most of the user interface logic resides, including the mailbox view, conversation view, settings, and other dashboard components. It's organized by feature, using Next.js's file-based routing. The structure within roughly follows this pattern:
  - Dashboard routes live under `(dashboard)`.
  - Embed routes live under `(embed)`.
  - Marketing routes live under `(marketing)`.
  - API routes live under `api`.
- **`lib/auth`:** Contains authentication-related logic, including mailbox creation and user management.
- **`components`:** Reusable UI components, hooks, and utility functions.
- **`content`:** Markdown content for the help center.
- **`db`:** Database migrations and schema definitions.
- **`jobs`:** Background functions powered by Supabase Cron and Queues, responsible for tasks like email processing, AI response generation, and data updates.
- **`lib`:** Core business logic, data access, and integrations with external services (Gmail, Slack, etc.). This is where you'll find the code that interacts with these services, processes data, and generates AI responses.
- **`lib/ai`:** AI-related functionality including chat completion, response generation, embeddings, and tools. Contains core AI logic for:
  - Chat message generation and streaming
  - Response generation with custom prompts
  - Conversation embeddings and summaries
  - Custom AI tools and function calling
  - Integration with Vercel AI SDK
- **`trpc`:** Contains the tRPC API router and context definitions.
- **`types`:** Type definitions used throughout the Next.js app, particularly for the tRPC API.
- **`tests`:** Unit and integration tests for the Next.js application and its components.
- **`db/schema`:** Contains all database table definitions and relationships using Drizzle ORM. Each domain entity (mailboxes, conversations, workflows, etc.) has its own schema file, providing type-safe database interactions.

### Packages

- **`packages/react`:** A React package providing a wrapper and hooks for integrating the Helper chat widget into other applications.
- **`packages/sdk`:** The core SDK for the embeddable chat widget, featuring:
  - Singleton pattern for widget instance management
  - Seamless iframe-based widget integration
  - Real-time messaging and notifications
  - Screenshot capabilities
  - Dynamic DOM observation for widget triggers
  - Session management and persistence
  - Customizable styling and theming

## Key Technologies

- **Next.js:** The primary framework for the web application, providing server-side rendering, API routes, and a robust component model.
- **tRPC:** Used for building the API, offering type safety and efficient communication between the frontend and backend.
- **Tailwind CSS:** Used for styling and UI components, ensuring consistency across web and mobile applications.
- **Drizzle ORM:** Database access library, enabling type-safe queries and database interactions.
- **Supabase:** For the database, user authentication, file storage, and background jobs.
- **Vercel AI SDK:** Used for building AI-powered features with streaming support, function calling, and type-safe AI responses.
- **Vitest:** For running unit and integration tests.
- **Sentry:** Error tracking and performance monitoring.

## Database Schema and Drizzle ORM

The database layer is built using Drizzle ORM, providing type-safe database interactions with PostgreSQL. The schema structure is organized as follows:

### Schema Organization

- **Location:** All database schemas reside in `db/schema/`
- **Structure:** Each domain entity has its own schema file (e.g., `mailboxes.ts`, `conversations.ts`, `platformCustomers.ts`)
- **Centralization:** All schemas are exported from a central `index.ts` file for easy access

### Schema Features

- Type-safe column definitions using PostgreSQL-specific types
- Automatic index creation and unique constraints
- Relationship definitions between tables using Drizzle's relations API
- Support for custom types and enums
- Built-in timestamp handling for created_at/updated_at fields
- Reusable utilities for common patterns (e.g., `withTimestamps`)

This schema structure enables type-safe database queries throughout the application, with Drizzle providing compile-time checking of SQL queries and automatic type inference for query results. The schema definitions serve as the single source of truth for the database structure and are used to generate migrations and maintain database consistency.

## Background Jobs with Supabase

Helper uses Supabase Cron and Queues for managing background jobs and event-driven processes. The background functions are organized following these patterns:

### Event Schema and Organization

- **Location:** Background functions are defined in `jobs/`
- **Event Schema:** Events are strongly typed using Zod schemas in `events.ts`
- **Function Types:** Two main types of functions:
  - Event-driven (e.g., `conversations/message.created`, `files/preview.generate`)
  - Scheduled/Cron jobs (e.g., cleanup tasks, periodic updates)

### Function Patterns

- **Plain Functions:** Core logic is exported as plain functions for easier testing
- **Error Handling:** Functions use `NonRetriableError` for permanent failures and `RetryAfterError` for temporary issues
- **Type Safety:** Event payloads are strongly typed using Zod schemas

### Common Use Cases

- Email processing and Gmail integration
- File preview generation
- Conversation embedding and indexing
- Scheduled cleanup tasks
- Webhook handling (Gmail, Slack)
- Report generation
- Notification delivery (Slack, email)

## Development Workflow

- **New Features:** Create a new branch for your feature. Implement the necessary changes in the appropriate directories (e.g., `app` for UI components, `lib` for backend logic). Add corresponding tests in the `tests` directory. Create a changeset to document your changes.
- **Bug Fixes:** Follow the same process as new features, but focus on resolving the specific issue and adding tests to prevent regressions.
- **Testing:** Run tests before submitting a pull request. Use `pnpm test` to run all tests or target specific files using Vitest CLI arguments.
- **Code Style:** Follow the existing code style and conventions. Use ESLint to ensure consistent code quality.

This overview provides a starting point for understanding the Helper codebase. Deeper dives into specific directories and files will be necessary for more detailed knowledge. Familiarize yourself with the key technologies used and don't hesitate to ask questions!
