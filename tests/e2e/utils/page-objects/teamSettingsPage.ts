import { expect, Page } from "@playwright/test";
import { generateTestEmail } from "../test-helpers";
import { BasePage } from "./basePage";

const TIMEOUTS = {
  ELEMENT_VISIBLE: 10000,
  NETWORK_IDLE: "networkidle" as const,
  FORM_STABILITY: 2000,
} as const;

const SELECTORS = {
  EMAIL_INPUT: "#email-input",
  NAME_INPUT: "#display-name-input",
  INVITE_FORM: "invite-member-form",
  ROLE_SELECTOR: "member-role-selector",
  PERMISSIONS_SELECTOR: "member-permissions-selector",
} as const;

const MESSAGES = {
  MEMBER_ADDED: "Team member added",
  MEMBER_REMOVED: "Member removed from the team",
  MEMBER_EXISTS: "Member already exists",
  VALIDATION_EMAIL: "Please enter a valid email address",
} as const;

export class TeamSettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToTeamSettings() {
    if (this.page.url().includes("/settings/team")) {
      await this.waitForPageLoad();
      return;
    }

    await this.goto("/settings/team");
    await this.page.waitForLoadState("domcontentloaded");
    await this.waitForTeamSettingsHeader();
  }

  async expectTeamSettingsPage() {
    await expect(this.page).toHaveURL(/.*settings\/team.*/);
    await this.waitForTeamSettingsHeader();
  }

  async inviteMember(email?: string): Promise<string> {
    const testEmail = email || generateTestEmail();
    
    await this.fillInviteForm(testEmail, `Test User ${Date.now()}`);
    await this.selectRole("Member");
    await this.submitInvite();
    
    return testEmail;
  }

  async expectMemberInvited(email: string) {
    await this.expectToast(MESSAGES.MEMBER_ADDED);
    await this.expectMemberInList(email);
  }

  async expectMemberInList(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  async removeMember(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    const removeButton = memberRow.getByRole("button", { name: "Delete" });
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    await this.confirmDeletion();
    await this.expectToast(MESSAGES.MEMBER_REMOVED);
  }

  async expectMemberRemoved(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).not.toBeVisible();
  }

  async changeRole(email: string, role: "admin" | "member") {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    const permissionsSelector = memberRow.getByTestId(SELECTORS.PERMISSIONS_SELECTOR);
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const roleText = role === "admin" ? "Admin" : "Member";
    const roleOption = this.page.getByRole("option", { name: roleText });
    await expect(roleOption).toBeVisible();
    await roleOption.click();

    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
    const updatedSelector = this.getMemberRow(email).getByTestId(SELECTORS.PERMISSIONS_SELECTOR);
    await expect(updatedSelector).toContainText(roleText, { timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectMemberRole(email: string, role: "admin" | "member") {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });

    const roleText = role === "admin" ? "Admin" : "Member";
    const permissionsDisplay = memberRow.locator("span").filter({ hasText: roleText });
    const permissionsSelector = memberRow.getByTestId(SELECTORS.PERMISSIONS_SELECTOR);

    try {
      await expect(permissionsDisplay).toBeVisible();
    } catch {
      await expect(permissionsSelector).toContainText(roleText);
    }
  }

  async expectAdminPermissions() {
    const inviteForm = this.page.getByTestId(SELECTORS.INVITE_FORM);
    await expect(inviteForm).toBeVisible();
    
    const emailInput = this.page.locator(SELECTORS.EMAIL_INPUT);
    await expect(emailInput).toBeEnabled();
    
    const nameInput = this.page.locator(SELECTORS.NAME_INPUT);
    await expect(nameInput).toBeEnabled();
    
    const roleSelector = this.page.getByTestId(SELECTORS.ROLE_SELECTOR);
    await expect(roleSelector).toBeEnabled();
  }

  async expectMemberPermissions() {
    const inviteForm = this.page.getByTestId(SELECTORS.INVITE_FORM);
    await expect(inviteForm).not.toBeVisible();
    
    const removeButtons = this.page.getByRole("button", { name: "Delete" });
    const count = await removeButtons.count();
    expect(count).toBe(0);
  }

  async expectTeamMembersList() {
    const membersList = this.page.locator("table");
    await expect(membersList).toBeVisible();
    await membersList.scrollIntoViewIfNeeded();
  }

  async getCurrentUserEmail(): Promise<string> {
    const memberRows = this.page.locator("tr");
    const count = await memberRows.count();

    if (count > 0) {
      const firstRow = memberRows.first();
      const emailPattern = /[^\s]+@[^\s]+\.[^\s]+/;
      const rowText = await firstRow.textContent();
      const emailMatch = rowText?.match(emailPattern);
      return emailMatch?.[0] || "support@gumroad.com";
    }

    return "support@gumroad.com";
  }

  async cancelInvite() {
    const emailInput = this.page.locator(SELECTORS.EMAIL_INPUT);
    const nameInput = this.page.locator(SELECTORS.NAME_INPUT);

    await emailInput.clear();
    await nameInput.clear();
    await this.page.keyboard.press("Escape");
  }

  async fillInviteForm(email: string, name: string) {
    const emailInput = this.page.locator(SELECTORS.EMAIL_INPUT);
    const nameInput = this.page.locator(SELECTORS.NAME_INPUT);
    
    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);
    
    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
  }

  async fillInvalidEmail(email: string) {
    const emailInput = this.page.locator(SELECTORS.EMAIL_INPUT);
    await emailInput.fill(email);
  }

  async inviteDuplicateMember(email: string) {
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
    await this.page.waitForTimeout(TIMEOUTS.FORM_STABILITY);
    
    await this.fillInviteForm(email, "Duplicate User");
    await this.selectRole("Member");
    await this.submitInvite();
  }

  async expectValidationError(message: string) {
    const errorMessage = this.page.getByText(message);
    await expect(errorMessage).toBeVisible();
  }

  async expectDuplicateError() {
    await this.expectToast(MESSAGES.MEMBER_EXISTS);
  }

  async expectFormCleared() {
    const emailInput = this.page.locator(SELECTORS.EMAIL_INPUT);
    const nameInput = this.page.locator(SELECTORS.NAME_INPUT);
    
    await expect(emailInput).toHaveValue("");
    await expect(nameInput).toHaveValue("");
  }

  private async waitForTeamSettingsHeader() {
    await this.page.waitForSelector('h2:has-text("Manage Team Members")', { timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  private getMemberRow(email: string) {
    return this.page.locator("tr").filter({ hasText: email });
  }

  private async selectRole(role: string) {
    const permissionsSelector = this.page.getByTestId(SELECTORS.ROLE_SELECTOR);
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const memberOption = this.page.getByRole("option", { name: role });
    await expect(memberOption).toBeVisible();
    await memberOption.click();
  }

  private async submitInvite() {
    const submitButton = this.page.getByRole("button", { name: "Add Member" });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  private async confirmDeletion() {
    const deleteDialog = this.page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();

    const confirmButton = deleteDialog.getByRole("button", { name: "Confirm Removal" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
  }

  private async expectToast(message: string) {
    const toast = this.page.locator(`[data-sonner-toast]:has-text("${message}")`);    
    await expect(toast).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }
}
