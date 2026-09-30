// keyboardNav.ts
// Remaps Enter to move focus to the next field within a form section,
// matching the legacy app's field-to-field navigation (Enter behaves like Tab).
// Attach as onKeyDown on the container wrapping the fields; relies on
// keydown bubbling up from whichever input/select is currently focused.

import type { KeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR = 'input:not([disabled]):not([type="hidden"]), select:not([disabled])';

export function handleEnterAsTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Enter') return;

  const target = e.target as HTMLElement;
  // Let textareas keep native Enter (newline) and don't hijack buttons.
  if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
  // Dropdown search inputs use Enter to pick an option.
  if (target.getAttribute('role') === 'combobox') return;

  const container = e.currentTarget;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null);
  const index = focusables.indexOf(target);
  if (index === -1) return;

  e.preventDefault();
  const next = focusables[index + 1];
  if (next) {
    next.focus();
    if (next instanceof HTMLInputElement) next.select();
  }
}
