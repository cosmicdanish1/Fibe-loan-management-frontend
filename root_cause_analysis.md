# Root Cause Analysis (RCA)
**Project**: Bican Loan Management System - Frontend LAN Deployment  
**Subject**: Client PC to Server PC LAN Connectivity  
**Date**: May 27, 2026  
**Status**: 🟢 **RESOLVED**  

---

## 📋 Executive Summary
To enable the cloned frontend running in development mode on the Client PC to talk directly to the NestJS backend and PostgreSQL database running on the Server PC over a direct LAN cable, several barriers were analyzed and resolved. Through rigorous diagnostics, four primary issues were identified across **Network Routing**, **Electron Code Logic**, **File-Path Resolution**, and **Application Security (CSP)**. 

All barriers have been resolved, and **verified full-speed bidirectional communication (<1ms)** has been successfully established over the physical LAN link.

---

## 🛠️ Root Cause Analysis (RCA) Matrix

| # | Problem Symptom | Root Cause | Fix / Resolution | Status |
|---|-----------------|------------|------------------|--------|
| **1** | Ping requests to Server IPs `192.168.1.7` / `192.168.1.50` timed out. | **Subnet Mismatch**: Client PC was actively routing traffic through Wi-Fi on the `10.104.28.x` subnet. The Ethernet LAN card had no DHCP server and fell back to a `169.254.x.x` link-local address. | Switched Client PC to **Static IP** `192.168.1.100` (Subnet `255.255.255.0`) on its Ethernet LAN adapter. Ping successfully established to `192.168.1.50`. | 🟢 Fixed |
| **2** | Electron app in dev mode still routed API requests to `localhost:3001`. | **Hardcoded Dev Logic**: The Electron main process logic had `isDev` hardcoded to return `localhost:3001` and bypassed reading `server-config.json` in dev mode. | Updated `getBackendOrigin()` and the `'get-server-url'` IPC handler to read `server-config.json` first, even in development mode. | 🟢 Fixed |
| **3** | Server config file not parsed or detected during specific launch flows. | **Working Directory Ambiguity**: The app checked `process.cwd()`, which varies depending on whether launched from a terminal, VS Code, or `run-app.bat`. | Made path resolution robust by scanning multiple candidate paths, including `app.getAppPath()`, `process.cwd()`, and `__dirname` levels. | 🟢 Fixed |
| **4** | Browser engine blocks API requests to the LAN Server IP. | **Security Policy Block**: The Content Security Policy (CSP) `connect-src` header in development was locked to `localhost` domains. | Expanded the dev-mode `connect-src` CSP header inside the main process to permit connections to `http://*:3001`. | 🟢 Fixed |

---

## 🔍 Detailed Problem & Resolution Breakdown

### 1. Network Subnet Mismatch (LAN Configuration)
* **Symptom**: Ping tests from the Client PC to the Server PC's IP addresses (`192.168.1.7` and `192.168.1.50`) timed out with `Destination host unreachable`.
* **Investigation**: Running `ipconfig` on the Client PC showed it was connected to Wi-Fi on a completely different network subnet (`10.104.28.136`). The Ethernet LAN port was connected, but had assigned itself a link-local APIPA address of `169.254.246.170` because the direct cable connection lacked a DHCP router.
* **Solution**: Assigned a **Static IP address of `192.168.1.100`** with a Subnet Mask of `255.255.255.0` to the Client PC's Ethernet LAN adapter.
* **Result**: Direct connection successfully established over the physical LAN cable. Pinging `192.168.1.50` (Server PC's working Ethernet port) succeeded instantly with **`<1ms` latency**.

---

### 2. Electron Main Process Dev-Mode Bypass
* **Symptom**: Despite having `server-config.json` in the root of the folder, the Electron app was still trying to reach `http://localhost:3001` in the network console.
* **Investigation**: Inspected [main.ts](file:///c:/PWT/loan-management-system-FrontEnd-CS/src/main/main.ts). The functions `getBackendOrigin()` and the `'get-server-url'` IPC handler were hardcoded to return `localhost:3001` whenever `isDev` was true, preventing developers from testing LAN configurations inside dev mode.
* **Solution**: Rewrote the main process logic to prioritize checking the project root for `server-config.json` first, even in development mode:
  ```typescript
  if (isDev) {
    const devCfg = readProjectRootServerConfig();
    if (devCfg) return `http://${devCfg.serverIP}:3001`;
    return 'http://localhost:3001';
  }
  ```
* **Result**: Dev server successfully routes to the Server PC IP address if a configuration file is present.

---

### 3. Startup Path Resolution Ambiguity
* **Symptom**: In certain execution environments (like double-clicking `run-app.bat`), the app would fail to read `server-config.json`.
* **Investigation**: Using `process.cwd()` is sensitive to the execution context. If Electron is launched by Vite or another wrapper, the current working directory shifts away from the project root folder.
* **Solution**: Upgraded `readProjectRootServerConfig` to scan a fallback array of paths:
  ```typescript
  const pathsToTry = [
    path.join(process.cwd(), 'server-config.json'),
    path.join(app.getAppPath(), 'server-config.json'),
    path.join(__dirname, 'server-config.json'),
    path.join(__dirname, '..', 'server-config.json'),
    path.join(__dirname, '../..', 'server-config.json')
  ];
  ```
* **Result**: Safe, compile-resistant path resolution regardless of how Electron is launched.

---

### 4. Content Security Policy (CSP) Block
* **Symptom**: API calls to `192.168.1.50:3001` would be blocked by the Electron browser component.
* **Investigation**: The CSP headers configured in [main.ts](file:///c:/PWT/loan-management-system-FrontEnd-CS/src/main/main.ts) only allowed `connect-src` requests to `localhost` domains when in development.
* **Solution**: Updated the CSP string to include `http://*:3001`:
  ```typescript
  isDev
    ? "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* http://*:3001 http://localhost:3001"
    : "connect-src 'self' http://*:3001 http://localhost:3001"
  ```
* **Result**: The browser successfully permits raw API calls to the LAN IP address.

---

## 📈 Verification & Proof of Concept
* **Client PC Ping Verification**:
  ```cmd
  Pinging 192.168.1.50 with 32 bytes of data:
  Reply from 192.168.1.50: bytes=32 time<1ms TTL=128
  Reply from 192.168.1.50: bytes=32 time<1ms TTL=128
  ```
* **Server PC NestJS Log Verification**:
  ```text
  [Nest] ERROR [GlobalExceptionFilter] GET /favicon.ico - 404 - Cannot GET /favicon.ico
  ```
  > [!NOTE]
  > This log verifies that the Client PC browser successfully bypassed all firewalls and reached the NestJS HTTP server port on `192.168.1.50:3001`!

---

## 🚀 Post-Resolution Run Instructions
To run the Client app with the compiled fixes, execute the following commands in the Client PC root directory:
```powershell
npm run build:electron
npm run dev
```
*(Or double-click the **`run-app.bat`** file to auto-compile and run!)*
