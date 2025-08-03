import { expect, test } from "@playwright/test";
import { cleanupTestMembers } from "../utils/db-cleanup";
import { TeamSettingsPage } from "../utils/page-objects/teamSettingsPage";
import { generateTestEmail, takeDebugScreenshot } from "../utils/test-helpers";

// Uses authenticated session with support@gumroad.com which has admin permissions
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe.configure({ mode: "serial" });

test.describe("Team Settings", () => {
  let teamSettingsPage: TeamSettingsPage;

  test.beforeEach(async ({ page }) => {
    teamSettingsPage = new TeamSettingsPage(page);

    // Wait for page to be ready and ensure stable state
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000); // Additional stability wait

    // Simple navigation without retry loop
    await teamSettingsPage.navigateToTeamSettings();
    await teamSettingsPage.expectTeamSettingsPage();
  });

  test("should allow admin-only operations", async ({ page }) => {
    // Test that admin can perform operations that require admin permissions

    // 1. Admin should see the invite form (member users would not see this)
    const inviteForm = page.getByTestId("invite-member-form");
    await expect(inviteForm).toBeVisible();

    // 2. Admin should see permission selectors for existing members
    const permissionSelectors = page.locator("select").filter({ hasText: "Permissions" });
    const selectorCount = await permissionSelectors.count();
    if (selectorCount > 0) {
      await expect(permissionSelectors.first()).toBeVisible();
    }

    // 3. Admin can fill out the invite form (this would be disabled for members)
    const emailInput = page.locator("#email-input");
    await expect(emailInput).toBeEnabled();

    const nameInput = page.locator("#display-name-input");
    await expect(nameInput).toBeEnabled();

    const roleSelector = page.getByTestId("member-role-selector");
    await expect(roleSelector).toBeEnabled();

    await takeDebugScreenshot(page, "admin-only-operations.png");
  });

  test("should invite a new team member", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    await takeDebugScreenshot(page, "team-member-invited.png");

    // Clean up the member we created
    await cleanupTestMembers([testEmail]);
  });

  test("should show invited member in team list", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    // Member should appear in the list after invitation
    await teamSettingsPage.expectMemberInList(testEmail);
    await takeDebugScreenshot(page, "team-member-in-list.png");

    // Clean up the member we created
    await cleanupTestMembers([testEmail]);
  });

  test("should remove a team member", async ({ page }) => {
    const testEmail = generateTestEmail();

    // First invite a member
    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    // Member should appear in the list
    await teamSettingsPage.expectMemberInList(testEmail);

    // Then remove the member
    await teamSettingsPage.removeMember(testEmail);
    await teamSettingsPage.expectMemberRemoved(testEmail);

    await takeDebugScreenshot(page, "team-member-removed.png");

    // Clean up in case the member wasn't properly removed
    await cleanupTestMembers([testEmail]);
  });

  test("should change member role from member to admin", async ({ page }) => {
    const testEmail = generateTestEmail();
    await page.waitForLoadState("networkidle");

    // Invite a member
    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    // Member should appear in the list
    await teamSettingsPage.expectMemberInList(testEmail);

    // Change role to admin
    await teamSettingsPage.changeRole(testEmail, "admin");
    await page.waitForLoadState("networkidle");
    await teamSettingsPage.expectMemberRole(testEmail, "admin");

    await takeDebugScreenshot(page, "team-member-role-admin.png");

    // Clean up the member we created
    await cleanupTestMembers([testEmail]);
  });

  test("should change member role from admin to member", async ({ page }) => {
    const testEmail = generateTestEmail();

    // Invite a member
    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    // Member should appear in the list
    await teamSettingsPage.expectMemberInList(testEmail);

    // First make them admin
    await teamSettingsPage.changeRole(testEmail, "admin");
    await page.waitForLoadState("networkidle");
    await teamSettingsPage.expectMemberRole(testEmail, "admin");

    // Then change back to member
    await teamSettingsPage.changeRole(testEmail, "member");
    await page.waitForLoadState("networkidle");
    await teamSettingsPage.expectMemberRole(testEmail, "member");

    await takeDebugScreenshot(page, "team-member-role-member.png");

    // Clean up the member we created
    await cleanupTestMembers([testEmail]);
  });

  test("should show admin permissions for admin users", async ({ page }) => {
    // The support@gumroad.com user has admin permissions (verified in database seeding)
    await teamSettingsPage.expectAdminPermissions();
    await takeDebugScreenshot(page, "team-admin-permissions.png");
  });

  test("should handle invite form validation", async ({ page }) => {
    // Try to invite with invalid email
    const emailInput = page.locator("#email-input");
    await emailInput.fill("invalid-email");

    // Should show validation error
    const errorMessage = page.getByText("Please enter a valid email address");
    await expect(errorMessage).toBeVisible();

    await takeDebugScreenshot(page, "team-invite-validation.png");
  });

  test("should handle duplicate email invitation", async ({ page }) => {
    const currentUserEmail = await teamSettingsPage.getCurrentUserEmail();

    // Wait for the team list to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Try to invite the current user (who already exists)
    const emailInput = page.locator("#email-input");
    await emailInput.fill(currentUserEmail);

    const nameInput = page.locator("#display-name-input");
    await nameInput.fill("Duplicate User");

    // Wait for the form to be ready and select permissions
    const permissionsSelector = page.getByTestId("member-role-selector");
    await expect(permissionsSelector).toBeVisible();
    await permissionsSelector.click();

    const memberOption = page.getByRole("option", { name: "Member" });
    await expect(memberOption).toBeVisible();
    await memberOption.click();

    // Wait for the button to be enabled
    const submitButton = page.getByRole("button", { name: "Add Member" });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Should show error toast about existing member
    const errorToast = page.locator('[data-sonner-toast]:has-text("Member already exists")');
    await expect(errorToast).toBeVisible();

    await takeDebugScreenshot(page, "team-duplicate-invite.png");
  });

  test("should cancel invite process", async ({ page }) => {
    // Fill some data in the form first
    const emailInput = page.locator("#email-input");
    await emailInput.fill("test@example.com");

    const nameInput = page.locator("#display-name-input");
    await nameInput.fill("Test User");

    // Cancel the invite (clear fields)
    await teamSettingsPage.cancelInvite();

    // Form should be cleared
    await expect(emailInput).toHaveValue("");
    await expect(nameInput).toHaveValue("");

    await takeDebugScreenshot(page, "team-invite-cancelled.png");
  });
});
