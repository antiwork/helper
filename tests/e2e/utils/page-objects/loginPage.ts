import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class LoginPage extends BasePage {
  private readonly emailInput = "#email"; // Using actual id instead of data-testid
  private readonly submitButton = 'button[type="submit"]';
  private readonly otpInputs = 'input[type="text"]'; // OTP inputs are likely text inputs
  private readonly loginForm = "form"; // Using actual form selector
  private readonly otpForm = "form"; // Will need to identify OTP form differently
  private readonly errorMessage = '.error, [role="alert"], .text-red-500'; // Common error selectors

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
