import { expect, test } from '@playwright/test';

const TEST_PHONE = '(202) 555-0100';

test.describe('OTP verification input', () => {
  test.use({
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('paste fills code and backspace moves across cells', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sign-in-screen')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId('sign-in-phone').fill(TEST_PHONE);
    await page.getByRole('button', { name: 'Text me a code' }).click();

    await expect(page.getByTestId('sign-in-code')).toBeVisible({
      timeout: 15_000,
    });

    const codeRoot = page.getByTestId('sign-in-code');
    const fields = codeRoot.locator('input');
    const firstField = fields.first();
    await firstField.focus();

    await page.evaluate(async (otp) => {
      await navigator.clipboard.writeText(otp);
    }, '55555');
    await firstField.press('ControlOrMeta+v');

    await expect(fields).toHaveCount(6);
    for (let i = 0; i < 5; i += 1) {
      await expect(fields.nth(i)).toHaveValue('5');
    }
    await expect(fields.nth(5)).toHaveValue('');

    // Backspace on empty last cell clears the previous digit
    await fields.nth(5).focus();
    await fields.nth(5).press('Backspace');
    await expect(fields.nth(4)).toHaveValue('');

    // Backspace again on empty cell clears the prior digit
    await fields.nth(4).press('Backspace');
    await expect(fields.nth(3)).toHaveValue('');
  });
});
