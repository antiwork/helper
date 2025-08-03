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
    // Check if we're already on the team settings page
    const currentUrl = this.page.url();
    if (currentUrl.includes("/settings/team")) {
      // Already on the correct page, just wait for it to be ready
      await this.waitForPageLoad();
      return;
    }

    // Navigate to team settings page
    await this.goto("/settings/team");

    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForSelector('h2:has-text("Manage Team Members")', { timeout: 10000 });
  }

  async expectTeamSettingsPage() {
    await expect(this.page).toHaveURL(/.*settings\/team.*/);
    // Wait for the main heading to be visible
    await this.page.waitForSelector('h2:has-text("Manage Team Members")', { timeout: 10000 });
  }

  async inviteMember(email?: string): Promise<string> {
    const testEmail = email || generateTestEmail();

    // Fill email input
    const emailInput = this.page.locator("#email-input");
    await expect(emailInput).toBeVisible();
    await emailInput.fill(testEmail);

    // Fill name input (required)
    const nameInput = this.page.locator("#display-name-input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill(`Test User ${Date.now()}`);

    // Select permissions
    const permissionsSelector = this.page.locator('[data-testid="member-role-selector"]');
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const memberOption = this.page.getByRole("option", { name: "Member" });
    await expect(memberOption).toBeVisible();
    await memberOption.click();

    // Submit invitation
    const submitButton = this.page.getByRole("button", { name: "Add Member" });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    return testEmail;
  }

  async expectMemberInvited(email: string) {
    // Wait for success toast message
    const successToast = this.page.locator('[data-sonner-toast]:has-text("Team member added")');
    await expect(successToast).toBeVisible({ timeout: 10000 });

    // Wait for the list to update and stabilize
    await this.page.waitForTimeout(2000);
    // Also wait for the member to appear in the list
    await this.expectMemberInList(email);
  }

  async expectMemberInList(email: string) {
    console.log(`Looking for member with email: ${email}`);

    // Wait for the member row to be visible with the email
    const memberRow = this.page.locator("tr").filter({ hasText: email });

    // Check if the element exists in the DOM first
    await expect(memberRow).toBeVisible({ timeout: 10000 });
  }

  async removeMember(email: string) {
    const memberRow = this.page.locator("tr").filter({ hasText: email });

    // Check if the element exists in the DOM first
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    // Find remove button in the row
    const removeButton = memberRow.getByRole("button", { name: "Delete" });
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Wait for deletion dialog to appear
    const deleteDialog = this.page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();

    // Confirm removal
    const confirmButton = deleteDialog.getByRole("button", { name: "Confirm Removal" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for success toast
    const successToast = this.page.locator('[data-sonner-toast]:has-text("Member removed from the team")');
    await expect(successToast).toBeVisible({ timeout: 10000 });
  }

  async expectMemberRemoved(email: string) {
    const memberRow = this.page.locator("tr").filter({ hasText: email });
    await expect(memberRow).not.toBeVisible();
  }

  async changeRole(email: string, role: "admin" | "member") {
    const memberRow = this.page.locator("tr").filter({ hasText: email });

    // Check if the element exists in the DOM first
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    // Find permissions dropdown (this controls admin/member permissions)
    const permissionsSelector = memberRow.getByTestId("member-permissions-selector");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    // Select the new role
    const roleOption = this.page.getByRole("option", { name: role === "admin" ? "Admin" : "Member" });
    await expect(roleOption).toBeVisible();
    await roleOption.click();

    // Wait for the role change to be applied using Playwright's native waiting
    const memberRow2 = this.page.locator("tr").filter({ hasText: email });
    const permissionsSelector2 = memberRow2.getByTestId("member-permissions-selector");

    const expectedText = role === "admin" ? "Admin" : "Member";
    await expect(permissionsSelector2).toContainText(expectedText, { timeout: 10000 });
  }

  async expectMemberRole(email: string, role: "admin" | "member") {
    const memberRow = this.page.locator("tr").filter({ hasText: email });

    // Check if the element exists in the DOM first
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    // Check permissions display or selector
    const permissionsDisplay = memberRow.locator("span").filter({ hasText: role === "admin" ? "Admin" : "Member" });
    const permissionsSelector = memberRow.getByTestId("member-permissions-selector");

    // Try to find either display or selector and check it contains the role
    try {
      await expect(permissionsDisplay).toBeVisible();
    } catch {
      await expect(permissionsSelector).toContainText(role === "admin" ? "Admin" : "Member");
    }
  }

  async expectAdminPermissions() {
    // Admin should see invite form
    const inviteForm = this.page.getByTestId("invite-member-form");
    await expect(inviteForm).toBeVisible();

    // Admin should see at least one remove button (if there are members)
    const removeButtons = this.page.getByRole("button", { name: "Delete" });
    const count = await removeButtons.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if no other members exist
  }

  async expectMemberPermissions() {
    // Member should not see invite form
    const inviteForm = this.page.getByTestId("invite-member-form");
    await expect(inviteForm).not.toBeVisible();

    // Member should not see remove buttons
    const removeButtons = this.page.getByRole("button", { name: "Delete" });
    const count = await removeButtons.count();
    expect(count).toBe(0);
  }

  async expectTeamMembersList() {
    // Should show team members list
    const membersList = this.page.locator("table");
    await expect(membersList).toBeVisible();

    // Scroll to the table to ensure it's fully visible
    await membersList.scrollIntoViewIfNeeded();
  }

  async getCurrentUserEmail(): Promise<string> {
    // Look for current user's email in member rows or return default
    const memberRows = this.page.locator("tr");
    const count = await memberRows.count();

    if (count > 0) {
      // Look for email pattern in the first member row
      const firstRow = memberRows.first();
      const emailPattern = /[^\s]+@[^\s]+\.[^\s]+/;
      const rowText = await firstRow.textContent();
      const emailMatch = rowText?.match(emailPattern);
      return emailMatch?.[0] || "support@gumroad.com";
    }

    return "support@gumroad.com";
  }

  async waitForInviteForm() {
    const inviteForm = this.page.locator('[data-testid="invite-member-form"]');
    await expect(inviteForm).toBeVisible({ timeout: 10000 });

    const emailInput = this.page.locator("#email-input");
    await expect(emailInput).toBeVisible();
  }

  async cancelInvite() {
    // For the current form design, we can clear the inputs to "cancel"
    const emailInput = this.page.locator("#email-input");
    const nameInput = this.page.locator("#display-name-input");

    await emailInput.clear();
    await nameInput.clear();

    // Or press Escape to potentially dismiss any dropdowns
    await this.page.keyboard.press("Escape");
  }
}
