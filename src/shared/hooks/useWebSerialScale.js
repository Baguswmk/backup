import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import {
  openPort,
  registerPort,
  unregisterPort,
  findSavedPort,
  hasSavedPort,
} from "./useSerialPortCoordinator";

const WEIGHT_PATTERNS = [
  /ST,GS,[+-]?(\d+\.?\d*)\s*kg/i,
  /[+-]?(\d+\.?\d*)\s*(?:kg|KG|Kg)/,
  /W:\s*(\d+\.?\d*)/,
  /NET:\s*(\d+\.?\d*)/,
  /WEIGHT:\s*(\d+\.?\d*)/,
];

const MAX_FRAMING_ERRORS  = 10;
const FRAMING_ERROR_RESET = 5000;
const RECONNECT_DELAY     = 2000;
const STABILITY_DURATION  = 1500;
const WEIGHT_TOLERANCE    = 0.1;

export const useWebSerialScale = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const [isConnected,  setIsConnected]  = useState(false);
  const [error,        setError]        = useState(null);
  const [isSupported,  setIsSupported]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const [lockedWeight,      setLockedWeight]      = useState(null);
  const [lockedTime,        setLockedTime]        = useState(null);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [isStable,          setIsStable]          = useState(false);

  const weightDataRef = useRef({ currentWeight: null, lastUpdate: null, rawData: null });

  const portRef                 = useRef(null);
  const readerRef               = useRef(null);
  const readLoopRef             = useRef(false);
  const isMountedRef            = useRef(true);
  const autoConnectAttemptedRef = useRef(false);
  const connectToPortRef        = useRef(null);

  const framingErrorCountRef    = useRef(0);
  const lastFramingErrorTimeRef = useRef(null);
  const reconnectTimeoutRef     = useRef(null);
  const isReconnectingRef       = useRef(false);

  const debugLogsRef = useRef([]);

  const addLog = useCallback((type, msg) => {
    const now = new Date();
    const ts  = now.toTimeString().slice(0, 8) + "." + String(now.getMilliseconds()).padStart(3, "0");
    debugLogsRef.current = [...debugLogsRef.current.slice(-299), { ts, type, msg }];
    forceUpdate();
  }, []);

  const clearDebugLogs = useCallback(() => { debugLogsRef.current = []; forceUpdate(); }, []);

  const stabilityTimerRef   = useRef(null);
  const lastStableWeightRef = useRef(null);
  const stableStartTimeRef  = useRef(null);

  const parseWeight = useCallback((rawData) => {
    if (!rawData) return null;
    for (const pattern of WEIGHT_PATTERNS) {
      const match = rawData.match(pattern);
      if (match) {
        const weight = parseFloat(match[1]);
        if (weight >= 0 && weight <= 99999.9) return Math.round(weight * 100) / 100;
      }
    }
    return null;
  }, []);

  const unlockWeight = useCallback(() => {
    setLockedWeight(null);
    setLockedTime(null);
    setStabilityProgress(0);
    setIsStable(false);
    lastStableWeightRef.current = null;
    stableStartTimeRef.current  = null;
    if (stabilityTimerRef.current) { clearInterval(stabilityTimerRef.current); stabilityTimerRef.current = null; }
  }, []);

  const manualLock = useCallback(() => {
    const w = parseFloat(weightDataRef.current.currentWeight);
    if (isNaN(w) || w <= 0) return { success: false, error: "Berat tidak valid" };
    if (stabilityTimerRef.current) { clearInterval(stabilityTimerRef.current); stabilityTimerRef.current = null; }
    setLockedWeight(w);
    setLockedTime(new Date());
    setStabilityProgress(100);
    setIsStable(true);
    return { success: true, weight: w };
  }, []);

  useEffect(() => {
    if (!isConnected || lockedWeight !== null) {
      if (stabilityTimerRef.current) { clearInterval(stabilityTimerRef.current); stabilityTimerRef.current = null; }
      stableStartTimeRef.current = null;
      setStabilityProgress(0);
      setIsStable(false);
      return;
    }
    const w = parseFloat(weightDataRef.current.currentWeight);
    if (isNaN(w) || w <= 0) return;

    const lastW         = lastStableWeightRef.current;
    const stable        = lastW !== null && Math.abs(w - lastW) <= WEIGHT_TOLERANCE;

    if (stable) {
      if (stableStartTimeRef.current === null) {
        stableStartTimeRef.current = Date.now();
        setIsStable(true);
        stabilityTimerRef.current = setInterval(() => {
          const elapsed = Date.now() - stableStartTimeRef.current;
          setStabilityProgress(Math.min((elapsed / STABILITY_DURATION) * 100, 100));
          if (elapsed >= STABILITY_DURATION) {
            setLockedWeight(w);
            setLockedTime(new Date());
            setStabilityProgress(100);
            clearInterval(stabilityTimerRef.current);
            stabilityTimerRef.current = null;
          }
        }, 100);
      }
    } else {
      if (stabilityTimerRef.current) { clearInterval(stabilityTimerRef.current); stabilityTimerRef.current = null; }
      stableStartTimeRef.current = null;
      setStabilityProgress(0);
      setIsStable(false);
    }
    lastStableWeightRef.current = w;
  }, [isConnected, lockedWeight, weightDataRef.current.lastUpdate]);

  // ─── Clean disconnect ─────────────────────────────────────────────────────
  const cleanDisconnect = useCallback(async () => {
    readLoopRef.current = false;
    const reader = readerRef.current;
    readerRef.current = null;
    if (reader) {
      try { await reader.cancel(); }  catch (_) {}
      try { reader.releaseLock(); }   catch (_) {}
    }
    await new Promise((r) => setTimeout(r, 50));
    if (portRef.current) {
      let retries = 5;
      while (retries > 0) {
        try { await portRef.current.close(); break; }
        catch (e) {
          retries--;
          if (retries === 0) console.error("❌ Failed to close port:", e.message);
          else await new Promise((r) => setTimeout(r, 150));
        }
      }
      portRef.current = null;
    }
    framingErrorCountRef.current    = 0;
    lastFramingErrorTimeRef.current = null;
    unlockWeight();
    setIsConnected(false);
    addLog("disconnect", "Disconnected");
  }, [unlockWeight, addLog]);

  // ─── Auto-reconnect (untuk framing error berlebihan) ─────────────────────
  const handleAutoReconnect = useCallback(async () => {
    if (isReconnectingRef.current || !isMountedRef.current) return;
    isReconnectingRef.current = true;
    const portToReconnect = portRef.current;
    await cleanDisconnect();
    await new Promise((r) => setTimeout(r, RECONNECT_DELAY));
    if (isMountedRef.current && portToReconnect) {
      try { await connectToPortRef.current(portToReconnect); }
      catch (err) { setError("Koneksi terputus. Klik Connect untuk menghubungkan kembali."); }
    } else if (isMountedRef.current) {
      setError("Koneksi terputus. Klik Connect untuk menghubungkan kembali.");
    }
    isReconnectingRef.current = false;
  }, [cleanDisconnect]);

  // ─── Read loop ────────────────────────────────────────────────────────────
  const readLoop = useCallback(async (port) => {
    readLoopRef.current = true;
    try {
      await new Promise((r) => setTimeout(r, 100));
      if (!port.readable) { setError("Port readable stream null"); return; }

      const dec = new TextDecoder("utf-8", { fatal: false, ignoreBOM: true });

      while (readLoopRef.current && isMountedRef.current && port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        let buffer = "", needNewReader = false;

        try {
          while (readLoopRef.current && isMountedRef.current) {
            let result;
            try { result = await reader.read(); }
            catch (e) {
              if (e.name === "FramingError") {
                const now = Date.now();
                if (lastFramingErrorTimeRef.current && now - lastFramingErrorTimeRef.current > FRAMING_ERROR_RESET)
                  framingErrorCountRef.current = 0;
                framingErrorCountRef.current++;
                lastFramingErrorTimeRef.current = now;
                if (framingErrorCountRef.current % 5 === 1)
                  console.warn(`⚠️ FramingError (${framingErrorCountRef.current}/${MAX_FRAMING_ERRORS})`);
                if (framingErrorCountRef.current >= MAX_FRAMING_ERRORS) {
                  console.error("❌ Too many framing errors, reconnecting...");
                  handleAutoReconnect();
                  readLoopRef.current = false;
                  break;
                }
                needNewReader = true; break;
              }
              if (e.name === "NetworkError") { readLoopRef.current = false; break; }
              await new Promise((r) => setTimeout(r, 100));
              continue;
            }

            const { value, done } = result;
            if (done || !isMountedRef.current) { readLoopRef.current = false; break; }

            const text = dec.decode(value, { stream: true });
            buffer += text;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.trim()) continue;
              const w = parseWeight(line);
              if (w !== null) {
                weightDataRef.current = { currentWeight: w, lastUpdate: new Date().toISOString(), rawData: line };
                framingErrorCountRef.current    = 0;
                lastFramingErrorTimeRef.current = null;
                if (isMountedRef.current) forceUpdate();
              }
            }
          }
        } finally {
          if (readerRef.current === reader) readerRef.current = null;
          try { await reader.cancel(); }  catch (_) {}
          try { reader.releaseLock(); }   catch (_) {}
        }

        if (needNewReader && readLoopRef.current && port.readable)
          await new Promise((r) => setTimeout(r, 200));
      }
    } catch (err) {
      console.error("❌ Read loop error:", err);
      setError(`Read error: ${err.message}`);
    }
  }, [parseWeight, handleAutoReconnect]);

  // ─── Connect to port ──────────────────────────────────────────────────────
  const connectToPort = useCallback(async (port) => {
    try {
      const existingReader = readerRef.current;
      readerRef.current = null;
      if (existingReader) {
        try { await existingReader.cancel(); existingReader.releaseLock(); } catch (_) {}
      }

      // Pakai mutex — kalau RFID sedang buka port, tunggu dulu
      await openPort("scale", () =>
        port.open({ baudRate: 2400, dataBits: 7, stopBits: 1, parity: "even", bufferSize: 1024 })
      );

      // ─── Flush stale USB buffer ───────────────────────────────────────────
      // USB chip (CH340/CP2102/FT232) menyimpan data lama di buffer RX-nya.
      // Begitu port dibuka, data kotor itu langsung masuk → FramingError di baris pertama.
      // Fix: baca dan buang semua yang masuk dalam 150ms pertama sebelum mulai proses data.
      if (port.readable) {
        const flusher = port.readable.getReader();
        const flushDeadline = Date.now() + 150;
        try {
          while (Date.now() < flushDeadline) {
            const raceTimeout = new Promise((r) => setTimeout(r, flushDeadline - Date.now(), { done: true }));
            const { done } = await Promise.race([flusher.read(), raceTimeout]);
            if (done) break;
          }
        } catch (_) {
          // FramingError dari data kotor — dibuang, tidak apa-apa
        } finally {
          try { flusher.releaseLock(); } catch (_) {}
        }
        addLog("connect", "🧹 Buffer flushed");
      }

      portRef.current = port;
      setIsConnected(true);
      setError(null);
      framingErrorCountRef.current = 0;
      addLog("connect", "✅ Connected");

      await registerPort("scale", port);
      readLoop(port); // fire-and-forget
      return { success: true };
    } catch (error) {
      console.error("❌ Connection error:", error);
      let msg = error.message;
      if (error.name === "NetworkError" || error.message.includes("Failed to open"))
        msg = "Port sedang digunakan. Tutup aplikasi lain, lalu disconnect → connect ulang.";
      setError(msg);
      setIsConnected(false);
      return { success: false, error: msg };
    }
  }, [readLoop, addLog]);

  useEffect(() => { connectToPortRef.current = connectToPort; }, [connectToPort]);

  // ─── Public connect (manual, dialog) ─────────────────────────────────────
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
    unregisterPort("scale");
    weightDataRef.current = { currentWeight: null, lastUpdate: null, rawData: null };
    if (isMountedRef.current) forceUpdate();
  }, [cleanDisconnect]);

  // ─── Auto-connect ─────────────────────────────────────────────────────────
  const autoConnect = useCallback(async () => {
    if (!navigator.serial || autoConnectAttemptedRef.current) return;
    autoConnectAttemptedRef.current = true;
    if (!hasSavedPort("scale")) return;

    const port = await findSavedPort("scale");
    if (!port) { addLog("auto", "⚠️ Port scale tidak ditemukan"); return; }

    addLog("auto", "▶️ Auto-connect scale...");
    await connectToPort(port);
  }, [connectToPort, addLog]);

  // ─── Physical disconnect event ────────────────────────────────────────────
  useEffect(() => {
    const onDisconnect = async (e) => {
      if (portRef.current !== e.target) return;
      setIsConnected(false);
      setError("Timbangan terputus dari komputer");
      await cleanDisconnect();
      weightDataRef.current = { currentWeight: null, lastUpdate: null, rawData: null };
      if (isMountedRef.current) forceUpdate();
    };
    if (navigator.serial) {
      navigator.serial.addEventListener("disconnect", onDisconnect);
      return () => navigator.serial.removeEventListener("disconnect", onDisconnect);
    }
  }, [cleanDisconnect]);

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsSupported("serial" in navigator);
    isMountedRef.current = true;

    // Scale auto-connect duluan — RFID nunggu via mutex kalau buka bersamaan
    const timer = setTimeout(() => {
      if (hasSavedPort("scale")) autoConnect();
      else addLog("auto", "Auto-connect skipped (tidak ada port tersimpan)");
    }, 500);

    const onBeforeUnload = () => { if (portRef.current) try { portRef.current.close(); } catch (_) {} };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (reconnectTimeoutRef.current)  clearTimeout(reconnectTimeoutRef.current);
      if (stabilityTimerRef.current)    clearInterval(stabilityTimerRef.current);
      isMountedRef.current = false;
      cleanDisconnect();
    };
  }, [autoConnect, cleanDisconnect, addLog]);

  // ─── Simulation ───────────────────────────────────────────────────────────
  const [isSimulating,          setIsSimulating]          = useState(false);
  const [simulatedWeight,       setSimulatedWeight]       = useState(0);
  const [currentSimulatedValue, setCurrentSimulatedValue] = useState(0);

  const simIntervalRef    = useRef(null);
  const isStabilizedRef   = useRef(false);
  const simulatedWeightRef = useRef(0);

  useEffect(() => { simulatedWeightRef.current = simulatedWeight; }, [simulatedWeight]);

  const toggleSimulation = useCallback(() => {
    setIsSimulating((prev) => {
      const next = !prev;
      if (!next) {
        if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
        setIsConnected(false); setLockedWeight(null); setCurrentSimulatedValue(0);
        isStabilizedRef.current = false;
        weightDataRef.current = { currentWeight: null, lastUpdate: null, rawData: null };
        addLog("sim", "Simulation stopped");
      } else {
        setIsConnected(true);
        isStabilizedRef.current = false;
        if (!simIntervalRef.current) {
          simIntervalRef.current = setInterval(() => {
            setCurrentSimulatedValue((prev) => {
              const target = simulatedWeightRef.current;
              if (isStabilizedRef.current) return target;
              const diff = target - prev;
              if (Math.abs(diff) < 0.1) return target + (Math.random() - 0.5) * 0.1;
              return prev + diff * 0.2;
            });
          }, 100);
        }
        addLog("sim", "Simulation started");
      }
      return next;
    });
  }, [addLog]);

  const setSimulatedTarget = useCallback((w) => {
    const val = parseFloat(w);
    if (!isNaN(val)) { setSimulatedWeight(val); isStabilizedRef.current = false; unlockWeight(); }
  }, [unlockWeight]);

  const stabilizeSimulation = useCallback(() => {
    isStabilizedRef.current = true;
    setCurrentSimulatedValue(simulatedWeightRef.current);
  }, []);

  useEffect(() => {
    if (isSimulating) {
      const w = Math.round(currentSimulatedValue * 100) / 100;
      weightDataRef.current = { currentWeight: w, lastUpdate: new Date().toISOString(), rawData: `SIM,${w}kg` };
      forceUpdate();
    }
  }, [isSimulating, currentSimulatedValue]);

  useEffect(() => () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); }, []);

  return {
    isConnected, isConnecting, isSupported,
    currentWeight: weightDataRef.current.currentWeight,
    lastUpdate:    weightDataRef.current.lastUpdate,
    rawData:       weightDataRef.current.rawData,
    error, connect, disconnect, autoConnect,
    lockedWeight, lockedTime, stabilityProgress, isStable, unlockWeight, manualLock,
    isSimulating, toggleSimulation, setSimulatedTarget, stabilizeSimulation,
    debugLogs: debugLogsRef.current, clearDebugLogs, addLog,
  };
};