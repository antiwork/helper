import { expect, Page } from "@playwright/test";
import { generateTestEmail } from "../test-helpers";
import { BasePage } from "./basePage";

type UserRole = "admin" | "member";

export class TeamSettingsPage extends BasePage {
  private readonly addMemberButton = "Add Member";
  private readonly deleteButton = "Delete";
  private readonly confirmRemovalButton = "Confirm Removal";
  private readonly adminRole = "Admin";
  private readonly memberRole = "Member";
  private readonly manageTeamHeader = "Manage Team Members";

  private readonly memberAddedMessage = "Team member added";
  private readonly memberRemovedMessage = "Member removed from the team";
  private readonly memberExistsMessage = "Member already exists";
  private readonly validationEmailMessage = "Please enter a valid email address";

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
    await this.selectRole(this.memberRole);
    await this.submitInvite();

    return testEmail;
  }

  async expectMemberInvited(email: string) {
    await this.expectToast(this.memberAddedMessage);
    await this.expectMemberInList(email);
  }

  async expectMemberInList(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });
  }

  async removeMember(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const removeButton = memberRow.getByRole("button", { name: this.deleteButton });
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    await this.confirmDeletion();
    await this.expectToast(this.memberRemovedMessage);
  }

  async expectMemberRemoved(email: string) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).not.toBeVisible();
  }

  async changeRole(email: string, role: UserRole) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const permissionsSelector = memberRow
      .getByRole("combobox")
      .filter({ has: this.page.locator("span").filter({ hasText: /^(Admin|Member)$/ }) });
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const roleText = role === "admin" ? this.adminRole : this.memberRole;
    const roleOption = this.page.getByRole("option", { name: roleText });
    await expect(roleOption).toBeVisible();
    await roleOption.click();

    await this.page.waitForLoadState("networkidle");
    const updatedSelector = memberRow
      .getByRole("combobox")
      .filter({ has: this.page.locator("span").filter({ hasText: roleText }) });
    await expect(updatedSelector).toBeVisible({ timeout: 10000 });
  }

  async expectMemberRole(email: string, role: UserRole) {
    const memberRow = this.getMemberRow(email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const roleText = role === "admin" ? this.adminRole : this.memberRole;
    const permissionsSelector = memberRow
      .getByRole("combobox")
      .filter({ has: this.page.locator("span").filter({ hasText: roleText }) });
    await expect(permissionsSelector).toBeVisible();
  }

  async expectAdminPermissions() {
    const inviteForm = this.getInviteForm();
    await expect(inviteForm).toBeVisible();

    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    await expect(emailInput).toBeEnabled();

    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });
    await expect(nameInput).toBeEnabled();

    const roleSelector = inviteForm.getByRole("combobox");
    await expect(roleSelector).toBeEnabled();
  }

  async expectMemberPermissions() {
    const inviteForm = this.getInviteForm();
    await expect(inviteForm).not.toBeVisible();

    const removeButtons = this.page.getByRole("button", { name: this.deleteButton });
    const count = await removeButtons.count();
    expect(count).toBe(0);
  }

  async expectTeamMembersList() {
    const membersList = this.page.locator("table");
    await expect(membersList).toBeVisible();
    await membersList.scrollIntoViewIfNeeded();
  }

  async getCurrentUserEmail(): Promise<string> {
    try {
      const memberRows = this.page.locator("tr");
      const count = await memberRows.count();

      if (count > 0) {
        const firstRow = memberRows.first();
        const emailPattern = /[^\s]+@[^\s]+\.[^\s]+/;
        const rowText = await firstRow.textContent();

        if (!rowText) {
          throw new Error("Could not extract text from member row");
        }

        const emailMatch = rowText.match(emailPattern);
        if (!emailMatch?.[0]) {
          throw new Error(`No valid email found in text: ${rowText}`);
        }

        return emailMatch[0];
      }

      throw new Error("No member rows found");
    } catch (error) {
      console.warn(`Failed to get current user email: ${error}. Using fallback.`);
      return "support@gumroad.com";
    }
  }

  async cancelInvite() {
    const inviteForm = this.getInviteForm();
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await emailInput.clear();
    await nameInput.clear();
    await this.page.keyboard.press("Escape");
  }

  async fillInviteForm(email: string, name: string) {
    const inviteForm = this.getInviteForm();
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);

    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
  }

  async fillInvalidEmail(email: string) {
    const inviteForm = this.getInviteForm();
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    await emailInput.fill(email);
    await emailInput.blur();
  }

  async inviteDuplicateMember(email: string) {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);

    await this.fillInviteForm(email, "Duplicate User");
    await this.selectRole(this.memberRole);
    await this.submitInvite();
  }

  async expectValidationError(message: string) {
    const errorMessage = this.page.getByText(message);
    await expect(errorMessage).toBeVisible();
  }

  async expectDuplicateError() {
    await this.expectToast(this.memberExistsMessage);
  }

  async expectFormCleared() {
    const inviteForm = this.getInviteForm();
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await expect(emailInput).toHaveValue("");
    await expect(nameInput).toHaveValue("");
  }

  private getInviteForm() {
    return this.page
      .locator("form")
      .filter({ has: this.page.getByRole("button", { name: new RegExp(this.addMemberButton, "i") }) });
  }

  private async waitForTeamSettingsHeader() {
    await this.page.waitForSelector(`h2:has-text("${this.manageTeamHeader}")`, {
      timeout: 10000,
    });
  }

  private getMemberRow(email: string) {
    return this.page.locator("tr").filter({ hasText: email });
  }

  private async selectRole(role: string) {
    const inviteForm = this.getInviteForm();
    const permissionsSelector = inviteForm.getByRole("combobox");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const memberOption = this.page.getByRole("option", { name: role });
    await expect(memberOption).toBeVisible();
    await memberOption.click();
  }

  private async submitInvite() {
    const submitButton = this.page.getByRole("button", { name: this.addMemberButton });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  private async confirmDeletion() {
    const deleteDialog = this.page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();

    const confirmButton = deleteDialog.getByRole("button", { name: this.confirmRemovalButton });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
  }

  private async expectToast(message: string) {
    const toast = this.page.locator(`[data-sonner-toast]:has-text("${message}")`);
    await expect(toast).toBeVisible({ timeout: 10000 });
  }
}
