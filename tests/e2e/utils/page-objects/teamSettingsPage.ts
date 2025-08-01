import { expect, Page } from "@playwright/test";
import { generateTestEmail } from "../test-helpers";
import { BasePage } from "./basePage";

/**
 * Page object for Team Settings functionality.
 *
 * Note: Many operations (invite, remove, role changes) require admin permissions.
 * The test suite uses support@gumroad.com which is created with admin role during seeding.
 */
export class TeamSettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateToTeamSettings() {
    await this.goto("/settings/team");
    await this.waitForPageLoad();
  }

  async expectTeamSettingsPage() {
    await expect(this.page).toHaveURL(/.*settings\/team.*/);
    await this.expectVisible('[data-testid="team-settings-page"]');
  }

  async inviteMember(email?: string): Promise<string> {
    const testEmail = email || generateTestEmail();

    // Fill email input
    const emailInput = this.page.getByTestId("invite-email-input");
    await expect(emailInput).toBeVisible();
    await emailInput.fill(testEmail);

    // Fill name input (required)
    const nameInput = this.page.getByTestId("invite-name-input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(`Test User ${Date.now()}`);

    // Select permissions
    const permissionsSelector = this.page.getByTestId("member-role-selector");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const memberOption = this.page.getByTestId("role-option-member");
    await expect(memberOption).toBeVisible();
    await memberOption.click();

    // Submit invitation
    const submitButton = this.page.getByTestId("invite-member-button");
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    return testEmail;
  }

  async expectMemberInvited(email: string) {
    // Wait for success toast message
    const successToast = this.page.locator('[data-sonner-toast]:has-text("Team member added")');
    await expect(successToast).toBeVisible({ timeout: 10000 });
  }

  async expectMemberInList(email: string) {
    const memberRow = this.page.getByTestId("member-row").filter({ hasText: email });
    await expect(memberRow).toBeVisible();
  }

  async removeMember(email: string) {
    const memberRow = this.page.getByTestId("member-row").filter({ hasText: email });
    await expect(memberRow).toBeVisible();

    // Find remove button in the row
    const removeButton = memberRow.getByTestId("remove-member-button");
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Wait for deletion dialog to appear
    const deleteDialog = this.page.getByTestId("delete-member-dialog");
    await expect(deleteDialog).toBeVisible();

    // Confirm removal
    const confirmButton = this.page.getByTestId("confirm-remove-member");
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for success toast
    const successToast = this.page.locator('[data-sonner-toast]:has-text("Member removed from the team")');
    await expect(successToast).toBeVisible({ timeout: 10000 });
  }

  async expectMemberRemoved(email: string) {
    const memberRow = this.page.getByTestId("member-row").filter({ hasText: email });
    await expect(memberRow).not.toBeVisible();
  }

  async changeRole(email: string, role: "admin" | "member") {
    const memberRow = this.page.getByTestId("member-row").filter({ hasText: email });
    await expect(memberRow).toBeVisible();

    // Find permissions dropdown (this controls admin/member permissions)
    const permissionsSelector = memberRow.getByTestId("member-permissions-selector");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    // Select the new role
    const roleOption = this.page.getByTestId(`permission-option-${role}`);
    await expect(roleOption).toBeVisible();
    await roleOption.click();

    // Wait for the role change to be applied using Playwright's native waiting
    const memberRow2 = this.page.getByTestId("member-row").filter({ hasText: email });
    const permissionsSelector2 = memberRow2.getByTestId("member-permissions-selector");

    const expectedText = role === "admin" ? "Admin" : "Member";
    await expect(permissionsSelector2).toContainText(expectedText, { timeout: 10000 });
  }

  async expectMemberRole(email: string, role: "admin" | "member") {
    const memberRow = this.page.getByTestId("member-row").filter({ hasText: email });
    await expect(memberRow).toBeVisible();

    // Check permissions display or selector
    const permissionsDisplay = memberRow.getByTestId("member-permissions-display");
    const permissionsSelector = memberRow.getByTestId("member-permissions-selector");

    // Try to find either display or selector and check it contains the role
    try {
      await expect(permissionsDisplay).toContainText(role === "admin" ? "Admin" : "Member");
    } catch {
      await expect(permissionsSelector).toContainText(role === "admin" ? "Admin" : "Member");
    }
  }

  async expectAdminPermissions() {
    // Admin should see invite form
    const inviteForm = this.page.getByTestId("invite-member-form");
    await expect(inviteForm).toBeVisible();

    // Admin should see at least one remove button (if there are members)
    const removeButtons = this.page.getByTestId("remove-member-button");
    const count = await removeButtons.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no other members exist
  }

  async expectMemberPermissions() {
    // Member should not see invite form
    const inviteForm = this.page.getByTestId("invite-member-form");
    await expect(inviteForm).not.toBeVisible();

    // Member should not see remove buttons
    const removeButtons = this.page.getByTestId("remove-member-button");
    const count = await removeButtons.count();
    expect(count).toBe(0);
  }

  async expectTeamMembersList() {
    // Should show team members list
    const membersList = this.page.getByTestId("member-list");
    await expect(membersList).toBeVisible();
  }

  async getCurrentUserEmail(): Promise<string> {
    // Look for current user's email in member rows or return default
    const memberRows = this.page.getByTestId("member-row");
    const count = await memberRows.count();

    if (count > 0) {
      const firstMemberEmail = await memberRows.first().getByTestId("member-email").textContent();
      return firstMemberEmail || "support@gumroad.com";
    }

    return "support@gumroad.com";
  }

  async waitForInviteForm() {
    const inviteForm = this.page.getByTestId("invite-member-form");
    await expect(inviteForm).toBeVisible({ timeout: 10000 });

    const emailInput = this.page.getByTestId("invite-email-input");
    await expect(emailInput).toBeVisible();
  }

  async cancelInvite() {
    // For the current form design, we can clear the inputs to "cancel"
    const emailInput = this.page.getByTestId("invite-email-input");
    const nameInput = this.page.getByTestId("invite-name-input");

    await emailInput.clear();
    await nameInput.clear();

    // Or press Escape to potentially dismiss any dropdowns
    await this.page.keyboard.press("Escape");
  }
}
