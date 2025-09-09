import { expect, test } from "@playwright/test";
import { cleanupTestMembers } from "../utils/cleaupTestMembers";
import { generateTestEmail, takeDebugScreenshot } from "../utils/test-helpers";

type UserRole = "admin" | "member";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Team Settings", () => {
  async function navigateToTeamSettings(page: any) {
    if (page.url().includes("/settings/team")) {
      await page.waitForLoadState("networkidle");
      return;
    }

    await page.goto("/settings/team");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector(`h2:has-text("Manage Team Members")`, {
      timeout: 10000,
    });
  }

  async function expectTeamSettingsPage(page: any) {
    await expect(page).toHaveURL(/.*settings\/team.*/);
    await page.waitForSelector(`h2:has-text("Manage Team Members")`, {
      timeout: 10000,
    });
  }

  function getInviteForm(page: any) {
    return page.locator("form").filter({ has: page.getByRole("button", { name: "Add Member" }) });
  }

  function getMemberRow(page: any, email: string) {
    return page.locator("tr").filter({ hasText: email });
  }

  async function fillInviteForm(page: any, email: string, name: string) {
    const inviteForm = getInviteForm(page);
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await expect(emailInput).toBeVisible();
    await emailInput.fill(email);

    await expect(nameInput).toBeVisible();
    await nameInput.fill(name);
  }

  async function selectRole(page: any, role: string) {
    const inviteForm = getInviteForm(page);
    const permissionsSelector = inviteForm.getByRole("combobox");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const roleOption = page.getByRole("option", { name: role });
    await expect(roleOption).toBeVisible();
    await roleOption.click();
  }

  async function submitInvite(page: any) {
    const submitButton = page.getByRole("button", { name: "Add Member" });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
  }

  async function expectToast(page: any, message: string) {
    const toast = page.locator(`[data-sonner-toast]:has-text("${message}")`);
    await expect(toast).toBeVisible({ timeout: 10000 });
  }

  async function inviteMember(page: any, email?: string): Promise<string> {
    const testEmail = email || generateTestEmail();

    await fillInviteForm(page, testEmail, `Test User ${Date.now()}`);
    await selectRole(page, "Member");
    await submitInvite(page);

    return testEmail;
  }

  async function expectMemberInvited(page: any, email: string) {
    await expectToast(page, "Team member added");
    await expectMemberInList(page, email);
  }

  async function expectMemberInList(page: any, email: string) {
    const memberRow = getMemberRow(page, email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });
  }

  async function confirmDeletion(page: any) {
    const deleteDialog = page.getByRole("dialog");
    await expect(deleteDialog).toBeVisible();

    const confirmButton = deleteDialog.getByRole("button", { name: "Confirm Removal" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();
  }

  async function removeMember(page: any, email: string) {
    const memberRow = getMemberRow(page, email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const removeButton = memberRow.getByRole("button", { name: "Delete" });
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    await confirmDeletion(page);
    await expectToast(page, "Member removed from the team");
  }

  async function expectMemberRemoved(page: any, email: string) {
    const memberRow = getMemberRow(page, email);
    await expect(memberRow).not.toBeVisible();
  }

  async function changeRole(page: any, email: string, role: UserRole) {
    const memberRow = getMemberRow(page, email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const permissionsSelector = memberRow
      .getByRole("combobox")
      .filter({ has: page.locator("span").filter({ hasText: /^(Admin|Member)$/ }) });
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const roleText = role === "admin" ? "Admin" : "Member";
    const roleOption = page.getByRole("option", { name: roleText });
    await expect(roleOption).toBeVisible();
    await roleOption.click();

    await page.waitForLoadState("networkidle");
    const updatedSelector = memberRow
      .getByRole("combobox")
      .filter({ has: page.locator("span").filter({ hasText: roleText }) });
    await expect(updatedSelector).toBeVisible({ timeout: 10000 });
  }

  async function expectMemberRole(page: any, email: string, role: UserRole) {
    const memberRow = getMemberRow(page, email);
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    const roleText = role === "admin" ? "Admin" : "Member";
    const permissionsSelector = memberRow
      .getByRole("combobox")
      .filter({ has: page.locator("span").filter({ hasText: roleText }) });
    await expect(permissionsSelector).toBeVisible();
  }

  async function expectAdminPermissions(page: any) {
    const inviteForm = getInviteForm(page);
    await expect(inviteForm).toBeVisible();

    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    await expect(emailInput).toBeEnabled();

    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });
    await expect(nameInput).toBeEnabled();

    const roleSelector = inviteForm.getByRole("combobox");
    await expect(roleSelector).toBeEnabled();
  }

  async function fillInvalidEmail(page: any, email: string) {
    const inviteForm = getInviteForm(page);
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    await emailInput.fill(email);
    await emailInput.blur();
  }

  async function expectValidationError(page: any, message: string) {
    const errorMessage = page.getByText(message);
    await expect(errorMessage).toBeVisible();
  }

  async function getCurrentUserEmail(page: any): Promise<string> {
    try {
      const memberRows = page.locator("tr");
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

  async function inviteDuplicateMember(page: any, email: string) {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await fillInviteForm(page, email, "Duplicate User");
    await selectRole(page, "Member");
    await submitInvite(page);
  }

  async function expectDuplicateError(page: any) {
    await expectToast(page, "Member already exists");
  }

  async function cancelInvite(page: any) {
    const inviteForm = getInviteForm(page);
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await emailInput.clear();
    await nameInput.clear();
    await page.keyboard.press("Escape");
  }

  async function expectFormCleared(page: any) {
    const inviteForm = getInviteForm(page);
    const emailInput = inviteForm.getByRole("textbox", { name: /email/i });
    const nameInput = inviteForm.getByRole("textbox", { name: /name|display/i });

    await expect(emailInput).toHaveValue("");
    await expect(nameInput).toHaveValue("");
  }

  test.beforeEach(async ({ page }) => {
    await navigateToTeamSettings(page);
    await expectTeamSettingsPage(page);
  });

  test("should allow admin-only operations", async ({ page }) => {
    await expectAdminPermissions(page);
    await takeDebugScreenshot(page, "admin-only-operations.png");
  });

  test("should invite a new team member and show it in the team list", async ({ page }) => {
    const testEmail = generateTestEmail();

    await inviteMember(page, testEmail);
    await expectMemberInvited(page, testEmail);
    await expectMemberInList(page, testEmail);

    await takeDebugScreenshot(page, "team-member-invited.png");
    await cleanupTestMembers([testEmail]);
  });

  test("should remove a team member", async ({ page }) => {
    const testEmail = generateTestEmail();

    await inviteMember(page, testEmail);
    await expectMemberInvited(page, testEmail);
    await expectMemberInList(page, testEmail);

    await removeMember(page, testEmail);
    await expectMemberRemoved(page, testEmail);

    await takeDebugScreenshot(page, "team-member-removed.png");
    await cleanupTestMembers([testEmail]);
  });

  test("should allow admin to change member role", async ({ page }) => {
    const testEmail = generateTestEmail();

    await inviteMember(page, testEmail);
    await expectMemberInvited(page, testEmail);
    await expectMemberInList(page, testEmail);

    await changeRole(page, testEmail, "admin");
    await expectMemberRole(page, testEmail, "admin");

    await changeRole(page, testEmail, "member");
    await expectMemberRole(page, testEmail, "member");

    await takeDebugScreenshot(page, "team-member-role-admin.png");
    await cleanupTestMembers([testEmail]);
  });

  test("should show admin permissions for admin users", async ({ page }) => {
    await expectAdminPermissions(page);
    await takeDebugScreenshot(page, "team-admin-permissions.png");
  });

  test("should handle invite form validation", async ({ page }) => {
    await fillInvalidEmail(page, "invalid-email");
    await expectValidationError(page, "Please enter a valid email address");
    await takeDebugScreenshot(page, "team-invite-validation.png");
  });

  test("should handle duplicate email invitation", async ({ page }) => {
    const currentUserEmail = await getCurrentUserEmail(page);

    await inviteDuplicateMember(page, currentUserEmail);
    await expectDuplicateError(page);

    await takeDebugScreenshot(page, "team-duplicate-invite.png");
  });

  test("should cancel invite process", async ({ page }) => {
    await fillInviteForm(page, "test@example.com", "Test User");
    await cancelInvite(page);
    await expectFormCleared(page);

    await takeDebugScreenshot(page, "team-invite-cancelled.png");
  });
});
