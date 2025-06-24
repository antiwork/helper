import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class LoginPage extends BasePage {
  private readonly emailInput = "#email"; // Using actual id instead of data-testid
  private readonly submitButton = 'button[type="submit"]';
  private readonly otpInputs = '[data-input-otp-slot]'; // OTP input slots
  private readonly loginForm = "form"; // Using actual form selector
  private readonly otpForm = '[data-input-otp-slot]'; // OTP input slots
  private readonly errorMessage = '.error, [role="alert"], .text-destructive'; // Common error selectors

  async navigateToLogin() {
    await this.goto("/login");
    await expect(this.page).toHaveTitle(/Helper/);
  }

  async enterEmail(email: string) {
    await this.page.fill(this.emailInput, email);
  }

  async submitEmail() {
    await this.page.click(this.submitButton);
  }

  async waitForOTPForm() {
    await expect(this.page.locator(this.otpForm)).toBeVisible();
  }

  async enterOTP(otp: string) {
    // TODO: In production tests, OTP would need to be retrieved from:
    // - Email API integration (like Gmail API)
    // - Test database for dev/staging environments
    // - Mock OTP service for automated testing
    // Currently using hardcoded OTP for development testing
    const digits = otp.split("");

    for (let i = 0; i < digits.length; i++) {
      await this.page.locator(this.otpInputs).nth(i).fill(digits[i]);
    }
  }

  async submitOTP() {
    await this.page.click(this.submitButton);
  }

  async login(email: string, otp: string) {
    await this.navigateToLogin();
    await this.enterEmail(email);
    await this.submitEmail();
    await this.waitForOTPForm();
    await this.enterOTP(otp);
    await this.submitOTP();
  }

  async expectLoginError() {
    await expect(this.page.locator(this.errorMessage)).toBeVisible();
  }

  async expectSuccessfulLogin() {
    await expect(this.page).toHaveURL(/.*dashboard.*|.*mailboxes.*/);
  }

  isOnLoginPage(): boolean {
    return this.page.url().includes("/login");
  }
}
