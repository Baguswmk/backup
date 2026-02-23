/**
 * useSerialPortCoordinator
 *
 * Dua tugas:
 *  1. Ingat port mana milik scale dan port mana milik rfid (pakai localStorage)
 *  2. Pastikan tidak ada dua port buka bersamaan — OS/USB controller tidak suka itu
 *
 * Cara kerja port mutex:
 *   - Siapapun yang mau buka port (scale atau rfid) harus panggil openPort()
 *   - openPort() menjamin hanya satu port.open() berjalan di satu waktu
 *   - Setelah selesai, tunggu 500ms settle time sebelum berikutnya boleh buka
 *   - Kalau 15 detik tidak dapat giliran → timeout error
 */

const LS = {
  scale: "serial_port_scale",
  rfid: "serial_port_rfid",
};

// ─── Active Connections State ────────────────────────────────────────────────
const activeConnections = {
  scale: { port: null, reader: null, writer: null },
  rfid: { port: null, reader: null, writer: null },
};

export function setCoordinatorConnection(role, port, reader, writer = null) {
  activeConnections[role] = { port, reader, writer };
}

export async function forceDisconnect(role) {
  const conn = activeConnections[role];
  if (!conn || !conn.port) return;

  console.log(`[Coordinator] forceDisconnect: mematikan ${role}`);

  if (conn.reader) {
    try {
      await conn.reader.cancel();
    } catch (_) {}
    try {
      conn.reader.releaseLock();
    } catch (_) {}
  }
  if (conn.writer) {
    try {
      conn.writer.releaseLock();
    } catch (_) {}
  }

  await new Promise((r) => setTimeout(r, 50));

  if (conn.port) {
    let retries = 5;
    while (retries > 0) {
      try {
        await conn.port.close();
        break;
      } catch (e) {
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  activeConnections[role] = { port: null, reader: null, writer: null };
}

// ─── Port identifier ──────────────────────────────────────────────────────────

async function portKey(port) {
  const info = port.getInfo?.() ?? {};
  const ports = await navigator.serial.getPorts();
  console.log("Granted ports:", ports);
  const idx = ports.indexOf(port);
  return `${info.usbVendorId ?? 0}:${info.usbProductId ?? 0}:${idx >= 0 ? idx : 0}`;
}

// ─── Mutex: satu port buka di satu waktu ─────────────────────────────────────

let _portBusy = false;

/**
 * Buka port dengan proteksi mutex.
 *
 * Usage:
 *   await openPort(role, () => port.open({ baudRate: 2400, ... }));
 *
 * - Kalau ada port lain sedang dibuka, tunggu sampai selesai + 500ms settle
 * - Timeout 15 detik kalau terlalu lama menunggu
 */
export async function openPort(role, openFn) {
  const deadline = Date.now() + 15_000;

  while (_portBusy) {
    if (Date.now() > deadline)
      throw new Error(`[${role}] Timeout menunggu port lain selesai terbuka`);
    await new Promise((r) => setTimeout(r, 100));
  }

  _portBusy = true;

  try {
    await openFn();
  } finally {
    // Settle time: beri OS waktu sebelum port berikutnya boleh buka
    await new Promise((r) => setTimeout(r, 500));
    _portBusy = false;
  }
}

// ─── Simpan/cari port di localStorage ────────────────────────────────────────

export async function registerPort(role, port) {
  if (!LS[role] || !navigator.serial) return;
  try {
    const key = await portKey(port);
    localStorage.setItem(LS[role], key);
  } catch (e) {
    console.warn("[Coordinator] registerPort gagal:", e);
  }
}

export function unregisterPort(role) {
  if (!LS[role]) return;
  localStorage.removeItem(LS[role]);
}

export function hasSavedPort(role) {
  return !!localStorage.getItem(LS[role]);
}

export async function findSavedPort(role) {
  if (!navigator.serial || !LS[role]) return null;

  const saved = localStorage.getItem(LS[role]);
  if (!saved) return null;

  try {
    const ports = await navigator.serial.getPorts();
    console.log("Granted ports:", ports);
    for (let i = 0; i < ports.length; i++) {
      const info = ports[i].getInfo?.() ?? {};
      const key = `${info.usbVendorId ?? 0}:${info.usbProductId ?? 0}:${i}`;
      if (key === saved) {
        return ports[i];
      }
    }
    localStorage.removeItem(LS[role]);
  } catch (e) {
    console.warn("[Coordinator] findSavedPort error:", e);
  }

  return null;
}

// ─── Backward-compat alias ────────────────────────────────────────────────────
export const savePortIdentity = registerPort;
export const clearPortIdentity = unregisterPort;
export const shouldAutoConnect = hasSavedPort;
