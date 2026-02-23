import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import {
  openPort,
  registerPort,
  unregisterPort,
  findSavedPort,
  hasSavedPort,
} from "./useSerialPortCoordinator";

// ─── HW-VX Series Protocol ────────────────────────────────────────────────────
const BAUD_RATE      = 57600;
const READER_ADDRESS = 0xff;
const CMD_INVENTORY  = 0x01;
const POLL_INTERVAL  = 300;
const SETTLE_MS      = 800; // tunggu ini setelah close sebelum open port yang sama

function calcCRC(data) {
  let value = 0xffff;
  for (const byte of data) {
    value ^= byte;
    for (let i = 0; i < 8; i++)
      value = (value & 1) !== 0 ? (value >> 1) ^ 0x8408 : value >> 1;
  }
  return value;
}

function buildCommand(cmd, address = READER_ADDRESS, data = []) {
  const base = [4 + data.length, address, cmd, ...data];
  const crc  = calcCRC(new Uint8Array(base));
  return new Uint8Array([...base, crc & 0xff, (crc >> 8) & 0xff]);
}

function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

function bytesToTagId(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");
}

export const useRFIDWebSerial = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const [isConnected,  setIsConnected]  = useState(false);
  const [error,        setError]        = useState(null);
  const [isSupported,  setIsSupported]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const rfidDataRef = useRef({ lastScan: null, lastUpdate: null, rawData: null });

  const portRef                 = useRef(null);
  const readerRef               = useRef(null);
  const writerRef               = useRef(null);
  const rxBufRef                = useRef(new Uint8Array(0));
  const isMountedRef            = useRef(true);
  const autoConnectAttemptedRef = useRef(false);
  const scanEnabledRef          = useRef(false);
  const scanLoopStateRef        = useRef("stopped");

  // Track port yang terakhir ditutup + waktu tutupnya
  // Dipakai untuk settle time kalau reconnect ke port yang sama
  const lastClosedPortRef = useRef(null);
  const lastClosedTimeRef = useRef(0);

  const debugLogsRef = useRef([]);

  const addLog = useCallback((type, msg) => {
    const now = new Date();
    const ts  = now.toTimeString().slice(0, 8) + "." + String(now.getMilliseconds()).padStart(3, "0");
    debugLogsRef.current = [...debugLogsRef.current.slice(-299), { ts, type, msg }];
    forceUpdate();
  }, []);

  const clearDebugLogs = useCallback(() => { debugLogsRef.current = []; forceUpdate(); }, []);

  const sendBytes = useCallback(async (bytes) => {
    if (!writerRef.current) throw new Error("Writer not ready");
    await writerRef.current.write(bytes);
    addLog("tx", `TX [${bytes.length}B]: ${toHex(bytes)}`);
  }, [addLog]);

  const readExact = useCallback(async (n, timeoutMs = 600) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (rxBufRef.current.length >= n) {
        const result = rxBufRef.current.slice(0, n);
        rxBufRef.current = rxBufRef.current.slice(n);
        return result;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    addLog("warn", `readExact(${n}) timeout — buffer ${rxBufRef.current.length}B`);
    return null;
  }, [addLog]);

  const startReadLoop = useCallback(async (port) => {
    if (!port.readable) { addLog("error", "port.readable null"); return; }
    const reader = port.readable.getReader();
    readerRef.current = reader;
    addLog("connect", "Read loop dimulai");
    try {
      while (isMountedRef.current && scanLoopStateRef.current !== "stopped") {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.length) {
          const merged = new Uint8Array(rxBufRef.current.length + value.length);
          merged.set(rxBufRef.current);
          merged.set(value, rxBufRef.current.length);
          rxBufRef.current = merged;
          addLog("raw", `RX [${value.length}B]: ${toHex(value)}`);
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") addLog("error", `Read loop error: ${e.name} — ${e.message}`);
    } finally {
      try { reader.releaseLock(); } catch (_) {}
      readerRef.current = null;
      addLog("disconnect", "Read loop selesai");
    }
  }, [addLog]);

  const doInventory = useCallback(async () => {
    try { await sendBytes(buildCommand(CMD_INVENTORY)); }
    catch (e) { addLog("error", `sendBytes gagal: ${e.message}`); return []; }

    const lenByte = await readExact(1, 600);
    if (!lenByte) return [];

    const body = await readExact(lenByte[0], 600);
    if (!body) { addLog("warn", "Response body incomplete"); return []; }

    const frame = new Uint8Array(1 + body.length);
    frame[0] = lenByte[0]; frame.set(body, 1);
    addLog("rx", `Frame [${frame.length}B]: ${toHex(frame)}`);

    if (frame.length < 6) { addLog("warn", "Frame terlalu pendek"); return []; }

    const status = frame[3];
    if (status !== 0x00) return [];

    const crcCalc = calcCRC(frame.slice(0, -2));
    const crcRecv = frame[frame.length - 2] | (frame[frame.length - 1] << 8);
    if (crcCalc !== crcRecv) { addLog("warn", "CRC mismatch"); return []; }

    const data = frame.slice(4, -2);
    if (data.length === 0) return [];

    const tags = [];
    let ptr = 1;
    for (let n = 0; n < data[0] && ptr < data.length; n++) {
      const tagLen   = data[ptr];
      const tagBytes = data.slice(ptr + 1, ptr + 1 + tagLen);
      ptr = ptr + 1 + tagLen;
      if (tagBytes.length === 0) continue;
      const tagId = bytesToTagId(tagBytes);
      addLog("scan", `TAG[${n + 1}/${data[0]}]: ${tagId}`);
      tags.push(tagId);
    }
    return tags;
  }, [sendBytes, readExact, addLog]);

  const scanLoop = useCallback(async () => {
    addLog("scan", "Poll loop dimulai");
    while (scanLoopStateRef.current === "running" && isMountedRef.current) {
      if (scanEnabledRef.current) {
        try {
          const tags = await doInventory();
          for (const tagId of tags) {
            rfidDataRef.current = { lastScan: tagId, lastUpdate: new Date().toISOString(), rawData: tagId };
            if (isMountedRef.current) forceUpdate();
          }
        } catch (e) { addLog("error", `Poll loop error: ${e.message}`); }
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
    addLog("scan", "Poll loop selesai");
  }, [doInventory, addLog]);

  // ─── Clean disconnect ─────────────────────────────────────────────────────
  const cleanDisconnect = useCallback(async () => {
    scanLoopStateRef.current = "stopped";
    scanEnabledRef.current   = false;

    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch (_) {}
      try { readerRef.current.releaseLock(); } catch (_) {}
      readerRef.current = null;
    }
    if (writerRef.current) {
      try { writerRef.current.releaseLock(); } catch (_) {}
      writerRef.current = null;
    }

    await new Promise((r) => setTimeout(r, 50));

    if (portRef.current) {
      const closingPort = portRef.current;
      let retries = 5;
      while (retries > 0) {
        try {
          await closingPort.close();
          // Catat port ini dan waktu tutupnya — untuk settle time di connectToPort
          lastClosedPortRef.current = closingPort;
          lastClosedTimeRef.current = Date.now();
          break;
        } catch (_) {
          retries--;
          if (retries > 0) await new Promise((r) => setTimeout(r, 150));
        }
      }
      portRef.current = null;
    }

    rxBufRef.current = new Uint8Array(0);
    setIsConnected(false);
  }, []);

  // ─── Connect to port ──────────────────────────────────────────────────────
  const connectToPort = useCallback(async (port) => {
    try {
      const existingReader = readerRef.current;
      readerRef.current = null;
      if (existingReader) {
        try { await existingReader.cancel(); } catch (_) {}
        try { existingReader.releaseLock(); } catch (_) {}
      }
      if (writerRef.current) {
        try { writerRef.current.releaseLock(); } catch (_) {}
        writerRef.current = null;
      }

      // Kalau port yang sama baru saja ditutup, tunggu OS release dulu.
      // Ini yang bikin "disconnect → connect" langsung gagal NetworkError.
      // Scale tidak kena masalah ini karena dialog requestPort() kasih jeda alami.
      const sinceClose = Date.now() - lastClosedTimeRef.current;
      if (lastClosedPortRef.current === port && sinceClose < SETTLE_MS) {
        const wait = SETTLE_MS - sinceClose;
        addLog("connect", `Tunggu ${wait}ms settle sebelum buka port...`);
        await new Promise((r) => setTimeout(r, wait));
      }

      await openPort("rfid", () =>
        port.open({ baudRate: BAUD_RATE, dataBits: 8, stopBits: 1, parity: "none", bufferSize: 2048 })
      );

      // Flush stale USB buffer — buang data kotor sebelum mulai baca
      if (port.readable) {
        const flusher = port.readable.getReader();
        const flushDeadline = Date.now() + 150;
        try {
          while (Date.now() < flushDeadline) {
            const timeout = new Promise((r) => setTimeout(r, flushDeadline - Date.now(), { done: true }));
            const { done } = await Promise.race([flusher.read(), timeout]);
            if (done) break;
          }
        } catch (_) {}
        finally { try { flusher.releaseLock(); } catch (_) {} }
        addLog("connect", "Buffer flushed");
      }

      portRef.current   = port;
      rxBufRef.current  = new Uint8Array(0);
      writerRef.current = port.writable?.getWriter() ?? null;

      const info = port.getInfo?.() ?? {};
      addLog("connect", `Port terbuka @ ${BAUD_RATE} baud — VID:0x${(info.usbVendorId ?? 0).toString(16).toUpperCase()} PID:0x${(info.usbProductId ?? 0).toString(16).toUpperCase()}`);

      await registerPort("rfid", port);

      setIsConnected(true);
      setError(null);
      scanLoopStateRef.current = "running";

      startReadLoop(port);
      scanLoop();

      return { success: true };
    } catch (error) {
      console.error("RFID Connection error:", error);
      addLog("error", `connectToPort: ${error.name} — ${error.message}`);
      let msg = error.message;
      if (error.name === "NetworkError" || error.message.includes("Failed to open"))
        msg = "Port RFID gagal dibuka. Coba lagi dalam beberapa detik.";
      setError(msg);
      setIsConnected(false);
      return { success: false, error: msg };
    }
  }, [startReadLoop, scanLoop, addLog]);

  // ─── Public connect (manual) ──────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!navigator.serial) { setError("WebSerial tidak didukung. Gunakan Chrome/Edge 89+"); return { success: false }; }
    setIsConnecting(true);
    setError(null);
    try {
      const port = await navigator.serial.requestPort();
      return await connectToPort(port);
    } catch (error) {
      if (error.name !== "NotFoundError") setError(`Connection error: ${error.message}`);
      setIsConnected(false);
      return { success: false, error: error.message };
    } finally {
      setIsConnecting(false);
    }
  }, [connectToPort]);

  // ─── Public disconnect (manual) ───────────────────────────────────────────
  const disconnect = useCallback(async () => {
    await cleanDisconnect();
    unregisterPort("rfid");
    rfidDataRef.current = { lastScan: null, lastUpdate: null, rawData: null };
    if (isMountedRef.current) forceUpdate();
  }, [cleanDisconnect]);

  // ─── Auto-connect ─────────────────────────────────────────────────────────
  const autoConnect = useCallback(async () => {
    if (!navigator.serial || autoConnectAttemptedRef.current) return;
    autoConnectAttemptedRef.current = true;
    if (!hasSavedPort("rfid")) return;

    const port = await findSavedPort("rfid");
    if (!port) { addLog("warn", "Port RFID tidak ditemukan"); return; }

    addLog("auto", "Auto-connect RFID...");
    await connectToPort(port);
  }, [connectToPort, addLog]);

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsSupported("serial" in navigator);
    isMountedRef.current = true;

    const timer = setTimeout(() => {
      if (hasSavedPort("rfid")) autoConnect();
      else addLog("auto", "Auto-connect skipped");
    }, 500);

    const onBeforeUnload = () => {
      scanLoopStateRef.current = "stopped";
      if (readerRef.current)  try { readerRef.current.cancel(); }     catch (_) {}
      if (writerRef.current)  try { writerRef.current.releaseLock(); } catch (_) {}
      if (portRef.current)    try { portRef.current.close(); }         catch (_) {}
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      isMountedRef.current = false;
      cleanDisconnect();
    };
  }, [cleanDisconnect, addLog, autoConnect]);

  const enableScanning = useCallback((enabled) => {
    scanEnabledRef.current = enabled;
    addLog("scan", enabled ? "Scanning AKTIF" : "Scanning NONAKTIF");
  }, [addLog]);

  const clearLastScan = useCallback(() => {
    rfidDataRef.current = { lastScan: null, lastUpdate: null, rawData: null };
    forceUpdate();
  }, []);

  const simulateScan = useCallback((rfidTag) => {
    if (rfidTag) {
      rfidDataRef.current = { lastScan: rfidTag, lastUpdate: new Date().toISOString(), rawData: `SIMULATED:${rfidTag}` };
      setIsConnected(true);
      forceUpdate();
    }
  }, []);

  return {
    isConnected, isConnecting, isSupported,
    lastScan:   rfidDataRef.current.lastScan,
    lastUpdate: rfidDataRef.current.lastUpdate,
    rawData:    rfidDataRef.current.rawData,
    error, connect, disconnect, autoConnect,
    enableScanning, clearLastScan, simulateScan,
    isScanning: scanEnabledRef.current,
    debugLogs: debugLogsRef.current, clearDebugLogs,
  };
};