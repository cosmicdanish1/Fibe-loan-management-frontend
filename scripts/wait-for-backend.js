/**
 * wait-for-backend.js
 *
 * Tries ALL IPs listed in server-config.json → serverIPs (or falls back to serverIP).
 * Whichever IP responds first on port 3001 wins.
 * Writes the winning IP back to serverIP so Vite proxy uses the correct one.
 */

const fs   = require('fs');
const net  = require('net');
const path = require('path');

const configPath = path.join(__dirname, '..', 'server-config.json');
const port       = 3001;
const timeoutMs  = 60000; // overall wait limit

// ── Read config ──────────────────────────────────────────────────────────────
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch {
  // no config file — use localhost fallback
}

// Build candidate list: serverIPs array takes priority, then single serverIP, then localhost
let candidates = [];

if (Array.isArray(config.serverIPs) && config.serverIPs.length > 0) {
  candidates = config.serverIPs.map(ip => ip.trim()).filter(Boolean);
} else if (typeof config.serverIP === 'string' && config.serverIP.trim()) {
  candidates = [config.serverIP.trim()];
} else {
  candidates = ['localhost'];
}

// Always include localhost — so this machine works whether it IS the server
// or is a client connecting over LAN. Whichever responds first wins.
candidates.push('localhost');

// Remove duplicates
candidates = [...new Set(candidates)];

console.log(`[wait-for-backend] Trying IPs: ${candidates.join(', ')} on port ${port}`);

// ── Race all candidates ───────────────────────────────────────────────────────
const start   = Date.now();
let resolved  = false;

function tryIP(host, callback) {
  function attempt() {
    if (resolved) return; // another IP already won

    const socket = net.createConnection({ host, port });

    socket.once('connect', () => {
      socket.destroy();
      if (!resolved) callback(null, host);
    });

    socket.once('error', () => {
      socket.destroy();
      if (!resolved && Date.now() - start < timeoutMs) {
        setTimeout(attempt, 1500);
      }
    });

    socket.setTimeout(2000, () => {
      socket.destroy();
      if (!resolved && Date.now() - start < timeoutMs) {
        setTimeout(attempt, 1500);
      }
    });
  }

  attempt();
}

// Overall timeout guard
const globalTimer = setTimeout(() => {
  if (!resolved) {
    console.error(`[wait-for-backend] Timed out after ${timeoutMs / 1000}s. None of these IPs responded: ${candidates.join(', ')}`);
    process.exit(1);
  }
}, timeoutMs);

// Fire all candidates in parallel — first one to connect wins
candidates.forEach(ip => {
  tryIP(ip, (err, winnerIP) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(globalTimer);

    console.log(`[wait-for-backend] ✅ Backend reachable at ${winnerIP}:${port}`);

    // Write the winning IP back so Vite proxy uses it
    try {
      config.serverIP = winnerIP;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`[wait-for-backend] Updated server-config.json → serverIP: ${winnerIP}`);
    } catch (e) {
      console.warn(`[wait-for-backend] Could not update server-config.json: ${e.message}`);
    }

    process.exit(0);
  });
});
