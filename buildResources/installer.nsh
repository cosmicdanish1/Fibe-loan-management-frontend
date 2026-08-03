; ============================================================
;  Fibe Loan Management — custom NSIS steps (electron-builder)
;  Included via package.json → build.nsis.include
; ============================================================

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
