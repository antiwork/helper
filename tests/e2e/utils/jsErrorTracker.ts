import { Page } from "@playwright/test";

export interface JSError {
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp: number;
}

export class JSErrorTracker {
  private errors: JSError[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupErrorListeners();
  }

  private setupErrorListeners() {
    this.page.on("pageerror", (error) => {
      this.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
    });

    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.errors.push({
          message: msg.text(),
          timestamp: Date.now(),
        });
      }
    });

    this.page.addInitScript(() => {
      window.addEventListener("error", (event) => {
        (window as any).__jsErrors = (window as any).__jsErrors || [];
        (window as any).__jsErrors.push({
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
          timestamp: Date.now(),
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        (window as any).__jsErrors = (window as any).__jsErrors || [];
        (window as any).__jsErrors.push({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          timestamp: Date.now(),
        });
      });
    });
  }

  async getClientSideErrors(): Promise<JSError[]> {
    try {
      const clientErrors = await this.page.evaluate(() => {
        return (window as any).__jsErrors || [];
      });
      return clientErrors;
    } catch {
      return [];
    }
  }

  getServerSideErrors(): JSError[] {
    return [...this.errors];
  }

  async getAllErrors(): Promise<JSError[]> {
    const clientErrors = await this.getClientSideErrors();
    const serverErrors = this.getServerSideErrors();
    return [...serverErrors, ...clientErrors];
  }

  clearErrors() {
    this.errors = [];
    this.page.evaluate(() => {
      (window as any).__jsErrors = [];
    }).catch(() => {});
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  async hasAnyErrors(): Promise<boolean> {
    const allErrors = await this.getAllErrors();
    return allErrors.length > 0;
  }

  async getErrorsAsString(): Promise<string> {
    const allErrors = await this.getAllErrors();
    if (allErrors.length === 0) return "";

    return allErrors
      .map((error, index) => {
        let errorStr = `Error ${index + 1}: ${error.message}`;
        if (error.url) errorStr += `\n  File: ${error.url}`;
        if (error.line) errorStr += `\n  Line: ${error.line}`;
        if (error.column) errorStr += `\n  Column: ${error.column}`;
        if (error.stack) errorStr += `\n  Stack: ${error.stack}`;
        return errorStr;
      })
      .join("\n\n");
  }
}
