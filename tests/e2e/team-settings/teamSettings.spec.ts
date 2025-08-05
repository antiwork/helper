import { test } from "@playwright/test";
import { TeamSettingsPage } from "../utils/page-objects/teamSettingsPage";
import { generateTestEmail, takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe.configure({ mode: "serial" });

test.describe("Team Settings", () => {
  let teamSettingsPage: TeamSettingsPage;

  test.beforeEach(async ({ page }) => {
    teamSettingsPage = new TeamSettingsPage(page);
    await teamSettingsPage.navigateToTeamSettings();
    await teamSettingsPage.expectTeamSettingsPage();
  });

  test("should allow admin-only operations", async ({ page }) => {
    await teamSettingsPage.expectAdminPermissions();
    await takeDebugScreenshot(page, "admin-only-operations.png");
  });

  test("should invite a new team member", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);

    await takeDebugScreenshot(page, "team-member-invited.png");
  });

  test("should show invited member in team list", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);
    await teamSettingsPage.expectMemberInList(testEmail);

    await takeDebugScreenshot(page, "team-member-in-list.png");
  });

  test("should remove a team member", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);
    await teamSettingsPage.expectMemberInList(testEmail);

    await teamSettingsPage.removeMember(testEmail);
    await teamSettingsPage.expectMemberRemoved(testEmail);

    await takeDebugScreenshot(page, "team-member-removed.png");
  });

  test("should change member role from member to admin", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);
    await teamSettingsPage.expectMemberInList(testEmail);

    await teamSettingsPage.changeRole(testEmail, "admin");
    await teamSettingsPage.expectMemberRole(testEmail, "admin");

    await takeDebugScreenshot(page, "team-member-role-admin.png");
  });

  test("should change member role from admin to member", async ({ page }) => {
    const testEmail = generateTestEmail();

    await teamSettingsPage.inviteMember(testEmail);
    await teamSettingsPage.expectMemberInvited(testEmail);
    await teamSettingsPage.expectMemberInList(testEmail);

    await teamSettingsPage.changeRole(testEmail, "admin");
    await teamSettingsPage.expectMemberRole(testEmail, "admin");

    await teamSettingsPage.changeRole(testEmail, "member");
    await teamSettingsPage.expectMemberRole(testEmail, "member");

    await takeDebugScreenshot(page, "team-member-role-member.png");
  });

  test("should show admin permissions for admin users", async ({ page }) => {
    await teamSettingsPage.expectAdminPermissions();
    await takeDebugScreenshot(page, "team-admin-permissions.png");
  });

  test("should handle invite form validation", async ({ page }) => {
    await teamSettingsPage.fillInvalidEmail("invalid-email");
    await teamSettingsPage.expectValidationError("Please enter a valid email address");
    await takeDebugScreenshot(page, "team-invite-validation.png");
  });

  test("should handle duplicate email invitation", async ({ page }) => {
    const currentUserEmail = await teamSettingsPage.getCurrentUserEmail();

    await teamSettingsPage.inviteDuplicateMember(currentUserEmail);
    await teamSettingsPage.expectDuplicateError();

    await takeDebugScreenshot(page, "team-duplicate-invite.png");
  });

  test("should cancel invite process", async ({ page }) => {
    await teamSettingsPage.fillInviteForm("test@example.com", "Test User");
    await teamSettingsPage.cancelInvite();
    await teamSettingsPage.expectFormCleared();

    await takeDebugScreenshot(page, "team-invite-cancelled.png");
  });
});
