import { useState, useEffect, useRef, useCallback } from "react";
import {
  openPort,
  registerPort,
  unregisterPort,
  findSavedPort,
  hasSavedPort,
  forceDisconnect,
  setCoordinatorConnection,
} from "./useSerialPortCoordinator";

const BAUD_RATE = 9600;

// CH340 USB Relay 1-channel protocol
// https://github.com/darrylb123/usbrelay
const CH340_RELAY_ON  = new Uint8Array([0xFF, 0x01, 0x01]);
const CH340_RELAY_OFF = new Uint8Array([0xFF, 0x01, 0x00]);

/** Durasi default bell berbunyi (ms) */
const DEFAULT_RING_DURATION_MS = 800;

export const useBellWebSerial = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const portRef = useRef(null);
  const writerRef = useRef(null);
  const active = useRef(false);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toISOString().split("T")[1].slice(0, -1);
    setDebugLogs((prev) => [...prev.slice(-99), { ts: time, type, msg }]);
  }, []);

  const clearDebugLogs = useCallback(() => setDebugLogs([]), []);

  // Simple read loop - Bell device mungkin kirim response/ack
  const readLoop = async (port) => {
    while (port.readable && active.current) {
      const reader = port.readable.getReader();
      setCoordinatorConnection("bell", port, reader, writerRef.current);
      try {
        const decoder = new TextDecoder();
        while (active.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const text = decoder.decode(value, { stream: true }).trim();
            if (text) addLog("recv", `← ${text}`);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          addLog("error", "Read error: " + err.message);
        }
      } finally {
        setCoordinatorConnection("bell", port, null, writerRef.current);
        try { reader.releaseLock(); } catch (_) {}
      }
    }
  };

  const connectToPort = async (port) => {
    try {
      await forceDisconnect("bell");

      await openPort("bell", () =>
        port.open({
          baudRate: BAUD_RATE,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          bufferSize: 256,
        })
      );

      portRef.current = port;
      writerRef.current = port.writable?.getWriter();
      setCoordinatorConnection("bell", port, null, writerRef.current);

      setIsConnected(true);
      setError(null);
      await registerPort("bell", port);
      addLog("connect", `Bell terhubung (baud ${BAUD_RATE})`);

      // Hardware settle time
      await new Promise((r) => setTimeout(r, 150));

      active.current = true;
      readLoop(port);

      return { success: true };
    } catch (err) {
      setIsConnected(false);
      setError("Gagal hubung Bell: " + err.message);
      addLog("error", "Gagal hubung: " + err.message);
      return { success: false, error: err.message };
    }
  };

  const connect = async () => {
    if (!navigator.serial) return { success: false, error: "Web Serial tidak didukung" };
    setIsConnecting(true);
    try {
      const port = await navigator.serial.requestPort();
      return await connectToPort(port);
    } catch (err) {
      if (err.name !== "NotFoundError") {
        setError(err.message);
        addLog("error", err.message);
      }
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    active.current = false;
    try {
      if (writerRef.current) {
        await writerRef.current.releaseLock();
        writerRef.current = null;
      }
    } catch (_) {}
    await forceDisconnect("bell");
    unregisterPort("bell");
    setIsConnected(false);
    portRef.current = null;
    addLog("disconnect", "Disconnected");
  };

  const autoConnect = async () => {
    if (hasSavedPort("bell")) {
      const port = await findSavedPort("bell");
      if (port) connectToPort(port);
    }
  };

  /**
   * Kirim sinyal trigger ke relay CH340.
   * @param {Uint8Array|string} [signal] - Override sinyal; default: CH340 RELAY ON
   */
  const trigger = useCallback(async (signal) => {
    if (!isConnected || !writerRef.current) {
      addLog("warn", "Bell belum terhubung");
      return { success: false, error: "Tidak terhubung" };
    }
    setIsTriggering(true);
    try {
      const bytes =
        signal instanceof Uint8Array
          ? signal
          : typeof signal === "string"
            ? new TextEncoder().encode(signal)
            : CH340_RELAY_ON;

      await writerRef.current.write(bytes);
      addLog("send", `→ [${Array.from(bytes).map(b => b.toString(16).padStart(2,"0").toUpperCase()).join(" ")}]`);
      return { success: true };
    } catch (err) {
      addLog("error", "Trigger gagal: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsTriggering(false);
    }
  }, [isConnected, addLog]);

  /**
   * Bunyikan bell selama durationMs milidetik lalu matikan otomatis.
   * Flow: RELAY ON → tunggu durationMs → RELAY OFF
   * @param {number} [durationMs=800]
   */
  const ringBell = useCallback(async (durationMs = DEFAULT_RING_DURATION_MS) => {
    if (!isConnected || !writerRef.current) {
      addLog("warn", "Bell belum terhubung, skip ring");
      return { success: false, error: "Tidak terhubung" };
    }
    setIsTriggering(true);
    try {
      // ON
      await writerRef.current.write(CH340_RELAY_ON);
      addLog("send", `→ RELAY ON [FF 01 01] (${durationMs}ms)`);

      // Tunggu
      await new Promise((r) => setTimeout(r, durationMs));

      // OFF
      await writerRef.current.write(CH340_RELAY_OFF);
      addLog("send", "→ RELAY OFF [FF 01 00]");

      return { success: true };
    } catch (err) {
      // Pastikan relay OFF meski error
      try { await writerRef.current?.write(CH340_RELAY_OFF); } catch (_) {}
      addLog("error", "ringBell gagal: " + err.message);
      return { success: false, error: err.message };
    } finally {
      setIsTriggering(false);
    }
  }, [isConnected, addLog]);

  useEffect(() => {
    setIsSupported("serial" in navigator);
    const timer = setTimeout(() => autoConnect(), 500);
    return () => {
      clearTimeout(timer);
      active.current = false;
      forceDisconnect("bell");
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isTriggering,
    isSupported,
    error,
    connect,
    disconnect,
    trigger,
    ringBell,
    debugLogs,
    clearDebugLogs,
    addLog,
  };
};
