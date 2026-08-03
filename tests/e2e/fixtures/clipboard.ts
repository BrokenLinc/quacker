import type { Locator } from '@playwright/test';

/**
 * Dispatch a paste event with clipboard data — works in CI headless Chromium
 * without navigator.clipboard permissions. Use for custom onPaste handlers.
 */
export async function pasteInto(locator: Locator, text: string) {
  await locator.focus();
  await locator.evaluate((el, pasteText) => {
    const data = new DataTransfer();
    data.setData('text/plain', pasteText);
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      })
    );
  }, text);
}

/** Simulate paste on a controlled text input (React onChange). */
export async function pasteIntoInput(locator: Locator, text: string) {
  await locator.focus();
  await locator.evaluate((el, pasteText) => {
    const input = el as HTMLInputElement;
    const data = new DataTransfer();
    data.setData('text/plain', pasteText);
    input.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      })
    );
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    setter?.call(input, pasteText);
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste',
        data: pasteText,
      })
    );
  }, text);
}
