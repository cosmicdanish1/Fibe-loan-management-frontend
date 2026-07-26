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
  ; first-launch Setup screen. serverIPs is a ready-to-edit example: the app
  ; tries serverIP AND every address in serverIPs at once and connects to
  ; whichever answers first (useful if the server has more than one network
  ; address, e.g. Ethernet + WiFi). Replace the example values, or clear the
  ; array, to match your actual network.
  IfFileExists "$INSTDIR\server-config.json" fibeCfgExists
    FileOpen $0 "$INSTDIR\server-config.json" w
    FileWrite $0 '{"serverIP": "", "serverIPs": ["192.168.1.3", "192.168.1.50", "SERVER"], "_note": "serverIP is set automatically by the in-app Setup screen. serverIPs is optional -- extra addresses to try in parallel (e.g. a second network card on the server). Edit or clear these example values."}'
    FileClose $0
  fibeCfgExists:

  ; Allow normal (non-admin) users to edit/save this ONE file — needed because
  ; Program Files is admin-only by default, and the app saves the IP the
  ; operator enters on the first-run setup screen. S-1-5-32-545 = BUILTIN\Users.
  nsExec::Exec 'icacls "$INSTDIR\server-config.json" /grant *S-1-5-32-545:M'
!macroend
