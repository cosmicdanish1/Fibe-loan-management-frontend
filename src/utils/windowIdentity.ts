// Identifies whether the current Electron window is the main dashboard window.
//
// Every window runs the same React app. The main (dashboard) window opens at
// the root hash, while child/tool windows open at a specific route hash
// (e.g. "#/loan-calculator", "#/utility/member-balance"). We capture the hash
// ONCE at module load — before HashRouter performs any client-side navigation
// (such as redirecting to /login on logout) — so the identity stays stable for
// the lifetime of the window.

const initialHash = window.location.hash;

export const IS_MAIN_WINDOW =
  initialHash === '' ||
  initialHash === '#' ||
  initialHash === '#/' ||
  initialHash === '#/dashboard' ||
  initialHash === '#/login';
