const { test, expect } = require("@playwright/test");

test("physbone workflow images open in-page zoom modal on click", async ({ page }) => {
  await page.goto("/avatar-customization/physbone/stretchable-parts-workflow");

  const firstImage = page.locator(".vp-doc img").first();
  await expect(firstImage).toBeVisible();
  await firstImage.click();

  const zoomOverlay = page.locator(".image-zoom-overlay.is-open");
  await expect(zoomOverlay).toBeVisible();
  await expect(page.locator(".image-zoom-overlay-image")).toBeVisible();

  await page.locator(".image-zoom-overlay-image").click();
  await expect(page.locator(".image-zoom-overlay.is-open")).toHaveCount(0);
});

test("zoom binding works after VitePress client-side route navigation", async ({ page }) => {
  await page.goto("/avatar-customization/physbone/stretchable-parts-workflow");
  await page.getByRole("link", { name: "Play Mode での伸び確認手順" }).click();
  await expect(page).toHaveURL(/\/avatar-customization\/physbone\/playmode-stretch-test(\.html)?$/);

  const firstImage = page.locator(".vp-doc img").first();
  await expect(firstImage).toBeVisible();
  await firstImage.click();
  await expect(page.locator(".image-zoom-overlay.is-open")).toBeVisible();
});
