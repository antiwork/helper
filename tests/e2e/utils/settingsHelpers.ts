export async function waitForSettingsSaved(page: any) {
  const saving = page.getByText("Saving", { exact: true });
  const saved = page.getByText("Saved", { exact: true });
  const error = page.getByText("Error", { exact: true });

  try {
    await saving.waitFor({ state: "visible" });
    await saved.waitFor({ state: "visible" });
  } catch (e) {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    console.warn("No saving indicator found. This should mean there were no changes, but may be worth checking.");
  }
}
