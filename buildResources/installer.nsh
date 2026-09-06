; ============================================================
;  Fibe Loan Management — custom NSIS steps (electron-builder)
;  Included via package.json → build.nsis.include
; ============================================================

; ==================== RELEASE NOTES ============================
; EDIT THIS BLOCK FOR EVERY NEW VERSION — nothing else does it for
; you. Shown as the very first screen a user sees, before Next is
; even clicked, so a stale entry here silently ships wrong changelog
; text with a perfectly successful build (see deploy\HOW_TO_BUILD_INSTALLERS.md §3).
;
; NSIS string rules: newline is $\r$\n (not \n). A literal double
; quote is $\". A literal dollar sign is $$.
; ${VERSION} is set by electron-builder from package.json — no need
; to hardcode it here.
!define RELEASE_NOTES "- App-wide dark mode, available from Settings on every screen.$\r$\n- Real role-based access control: login, navigation, and every route now enforce each user's configured rights (previously had no effect).$\r$\n- Security fixes: member KYC document access, file-upload handling, an account-takeover login issue, and password policy enforcement.$\r$\n- Day-End: fixed a bug allowing two runs at once, plus further date/timezone fixes; added an admin-only auto-close option.$\r$\n- Large batch of accuracy fixes across Financial Year, Day-End, Vouchers, FD/RD, Ledger Reports, and Monthly/Yearly Reports.$\r$\n- Demand & Recovery, Business Rules, and Communication Hub screens fixed after being non-functional.$\r$\n- Numerous smaller data-integrity and validation fixes across Member, Savings, RD, FD, and Loan modules."
; ================================================================

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Fibe Loan Management ${VERSION}"
  !define MUI_WELCOMEPAGE_TEXT "This will install Fibe Loan Management version ${VERSION} on your computer.$\r$\n$\r$\nWhat's new in this version:$\r$\n$\r$\n${RELEASE_NOTES}$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInstall
  ; Create server-config.json right in the install folder so it is easy to
  ; find and edit, e.g.:
  ;   C:\Program Files\Fibe Loan Management\server-config.json
  ; Created ONLY if missing — an update never wipes a configured IP.
  ; serverIP stays "" (empty = not configured yet) so the app still shows the
  ; first-launch Setup screen, and the app additionally races localhost so a
  ; server-PC install connects with no configuration at all.
  ;
  ; serverIPs ships EMPTY on purpose. It used to contain example addresses
  ; (192.168.1.3 / 192.168.1.50 / SERVER); those are real routable addresses,
  ; so on a customer network where some unrelated machine answers on port 3001
  ; the app could connect to the wrong server. Add real addresses here only
  ; when the server genuinely has more than one (e.g. Ethernet + WiFi) — every
  ; entry is probed in parallel and the first to answer wins.
  IfFileExists "$INSTDIR\server-config.json" fibeCfgExists
    FileOpen $0 "$INSTDIR\server-config.json" w
    FileWrite $0 '{"serverIP": "", "serverIPs": [], "_note": "serverIP is set automatically by the in-app Setup screen. serverIPs is optional -- add extra addresses here only if the server has more than one (e.g. a second network card); all are tried in parallel and the first to answer wins."}'
    FileClose $0
  fibeCfgExists:

  ; Allow normal (non-admin) users to edit/save this ONE file — needed because
  ; Program Files is admin-only by default, and the app saves the IP the
  ; operator enters on the first-run setup screen. S-1-5-32-545 = BUILTIN\Users.
  nsExec::Exec 'icacls "$INSTDIR\server-config.json" /grant *S-1-5-32-545:M'

  ; Create a "logs" folder right in the install folder, next to the .exe —
  ; e.g. C:\Program Files\Fibe Loan Management\logs\main.log and renderer.log.
  ; Mirrors C:\FibeServer\backend\logs\ on the server, so a technician checks
  ; both in the same way instead of hunting for the hidden AppData\Roaming
  ; folder Electron uses by default. See resolveLogDir() in src/main/logger.ts.
  ;
  ; CreateDirectory is safe to run on every install/update — it's a no-op if
  ; the folder already exists, so an upgrade never disturbs existing logs.
  CreateDirectory "$INSTDIR\logs"

  ; Grant BUILTIN\Users write access, same reasoning as server-config.json
  ; above: Program Files is admin-only, but the app itself runs as whatever
  ; user is logged in, not elevated, so without this log writes fail silently.
  ; (OI)(CI) = Object/Container Inherit, so every rotated log file the app
  ; creates later under this folder inherits the same write permission
  ; automatically — this one grant does not need to be reapplied per file.
  nsExec::Exec 'icacls "$INSTDIR\logs" /grant *S-1-5-32-545:(OI)(CI)M'
!macroend
