/**
 * serverConfig.ts
 *
 * Single source of truth for the backend base URL.
 *
 * Supports multiple IPs (LAN + WiFi) — races them all and uses whichever
 * responds first on /api/v1/health.
 *
 * Priority:
 *  1. Electron IPC (electronAPI.getServerUrl) → already resolved by main process
 *  2. /server-config.json → tries all IPs in serverIPs array in parallel
 *  3. localhost fallback (dev)
 */

const DEV_FALLBACK    = 'http://localhost:3001/api/v1';
const BROWSER_DEV_PROXY = '/api/v1';
const BROWSER_CONFIG_PATH = '/server-config.json';

let _resolvedUrl: string = DEV_FALLBACK;
let _ready = false;

/** Try to reach a backend IP — resolves with the URL if reachable, rejects if not */
function probeIP(ip: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `http://${ip}:3001/api/v1/health`;
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, 4000);

    fetch(url, { signal: controller.signal, cache: 'no-store' })
      .then(res => {
        clearTimeout(timer);
        if (res.ok) resolve(`http://${ip}:3001/api/v1`);
        else reject(new Error(`HTTP ${res.status}`));
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Race all IPs — return first one that responds */
async function findWorkingIP(ips: string[]): Promise<string | null> {
  if (!ips || ips.length === 0) return null;

  return new Promise(resolve => {
    let settled = false;
    let failures = 0;

    ips.forEach(ip => {
      probeIP(ip)
        .then(url => {
          if (!settled) {
            settled = true;
            console.log(`[serverConfig] ✅ Connected via: ${url}`);
            resolve(url);
          }
        })
        .catch(() => {
          failures++;
          if (failures === ips.length && !settled) {
            // All failed
            resolve(null);
          }
        });
    });
  });
}

async function readBrowserServerConfig(): Promise<{ serverIP?: string; serverIPs?: string[] } | null> {
  try {
    const response = await fetch(BROWSER_CONFIG_PATH, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Kicked off immediately on module load.
 * Resolves the best available backend URL.
 */
const _initPromise: Promise<void> = (async () => {
  try {
    const eAPI = (window as any).electronAPI;
    if (eAPI?.getServerUrl) {
      const result: { url: string | null; configured: boolean } = await eAPI.getServerUrl();
      if (result?.url) {
        // In Electron dev mode use Vite proxy to avoid CORS
        const isViteDev = window.location.hostname === 'localhost' && !!window.location.port;
        _resolvedUrl = isViteDev ? BROWSER_DEV_PROXY : result.url;
        _ready = true;
        return;
      }
    }
  } catch {
    /* Not in Electron */
  }

  // Browser mode — read server-config.json and race all IPs
  const cfg = await readBrowserServerConfig();
  if (cfg) {
    // Build candidate list
    const candidates: string[] = [];
    if (Array.isArray(cfg.serverIPs)) candidates.push(...cfg.serverIPs.map((s: string) => s.trim()).filter(Boolean));
    if (cfg.serverIP && !candidates.includes(cfg.serverIP.trim())) candidates.push(cfg.serverIP.trim());

    if (candidates.length > 0) {
      const isViteDev = window.location.hostname === 'localhost' && !!window.location.port;

      if (isViteDev) {
        // In Vite dev mode always use the proxy path (main process already resolved the IP)
        _resolvedUrl = BROWSER_DEV_PROXY;
      } else {
        // Production / direct browser: race all IPs
        console.log(`[serverConfig] Racing IPs: ${candidates.join(', ')}`);
        const winner = await findWorkingIP(candidates);
        _resolvedUrl = winner ?? DEV_FALLBACK;
      }

      _ready = true;
      return;
    }
  }

  _resolvedUrl = DEV_FALLBACK;
  _ready = true;
})();

/**
 * Async getter — always correct, awaits config load on first call.
 */
export async function getApiBaseUrl(): Promise<string> {
  if (!_ready) await _initPromise;
  return _resolvedUrl;
}

/**
 * Sync getter — returns best-known URL without waiting.
 * Safe after first async call resolves.
 */
export function getApiBaseUrlSync(): string {
  return _resolvedUrl;
}
