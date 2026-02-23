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

const WEIGHT_PATTERNS = [
  /ST,GS,[+-]?(\d+\.?\d*)\s*kg/i,
  /[+-]?(\d+\.?\d*)\s*(?:kg|KG|Kg)/,
  /W:\s*(\d+\.?\d*)/,
  /NET:\s*(\d+\.?\d*)/,
  /WEIGHT:\s*(\d+\.?\d*)/,
];

export const useWebSerialScale = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const [currentWeight, setCurrentWeight] = useState(null);
  const [lockedWeight, setLockedWeight] = useState(null);
  const [isStable, setIsStable] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0);

  const [isSimulating, setIsSimulating] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const portRef = useRef(null);
  const readLoopActive = useRef(false);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toISOString().split("T")[1].slice(0, -1);
    setDebugLogs((prev) => [...prev.slice(-99), { ts: time, type, msg }]);
  }, []);

  const clearDebugLogs = useCallback(() => setDebugLogs([]), []);

  // -- Parser --
  const parseWeight = (line) => {
    for (const pattern of WEIGHT_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const w = parseFloat(match[1]);
        if (w >= 0) return Math.round(w * 100) / 100;
      }
    }
    return null;
  };

  // -- Reading Logic --
  const startReadLoop = async (port) => {
    readLoopActive.current = true;
    while (port.readable && readLoopActive.current) {
      const reader = port.readable.getReader();
      setCoordinatorConnection("scale", port, reader);

      try {
        const decoder = new TextDecoder();
        let buffer = "";
        while (readLoopActive.current) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const w = parseWeight(line);
            if (w !== null) {
              setCurrentWeight(w);
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          addLog("error", "Read error: " + err.message);
        }
      } finally {
        setCoordinatorConnection("scale", port, null);
        try {
          reader.releaseLock();
        } catch (_) {}
      }
    }
  };

  const connectToPort = async (port) => {
    try {
      // 1. Force Disconnect role ini kalau ada yg masih nyangkut
      await forceDisconnect("scale");

      // 2. Gunakan mutex coordinator untuk memastikan aman
      await openPort("scale", () =>
        port.open({
          baudRate: 2400,
          dataBits: 7,
          stopBits: 1,
          parity: "even",
          bufferSize: 1024,
        }),
      );

      // Harware settle time
      await new Promise((r) => setTimeout(r, 150));

      portRef.current = port;
      setCoordinatorConnection("scale", port, null);
      setIsConnected(true);
      setError(null);
      await registerPort("scale", port);
      addLog("connect", "Timbangan connected");

      // Fire and forget read loop
      startReadLoop(port);
      return { success: true };
    } catch (err) {
      setIsConnected(false);
      setError("Gagal menghubungkan timbangan: " + err.message);
      return { success: false, error: err.message };
    }
  };

  const connect = async () => {
    if (!navigator.serial) return { success: false };
    setIsConnecting(true);
    try {
      const port = await navigator.serial.requestPort();
      return await connectToPort(port);
    } catch (err) {
      if (err.name !== "NotFoundError") setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    readLoopActive.current = false;
    await forceDisconnect("scale");
    unregisterPort("scale");
    portRef.current = null;
    setIsConnected(false);
    setCurrentWeight(null);
    unlockWeight();
    addLog("disconnect", "Disconnected");
  };

  const autoConnect = async () => {
    if (hasSavedPort("scale")) {
      const port = await findSavedPort("scale");
      if (port) connectToPort(port);
    }
  };

  // Lifecycle
  useEffect(() => {
    setIsSupported("serial" in navigator);
    const timer = setTimeout(() => autoConnect(), 500);
    return () => {
      clearTimeout(timer);
      readLoopActive.current = false;
      forceDisconnect("scale");
    };
  }, []);

  // -- Stability Logic (Simplified & Robust) --
  const stableTimerRef = useRef(null);
  const lastWeightRef = useRef(null);
  const activeWeightRef = useRef(null);

  useEffect(() => {
    activeWeightRef.current = currentWeight;
  }, [currentWeight]);

  useEffect(() => {
    if (!isConnected && !isSimulating) {
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
      stableTimerRef.current = null;
      return;
    }
    if (lockedWeight !== null) {
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
      stableTimerRef.current = null;
      return;
    }
    if (currentWeight === null) {
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
      stableTimerRef.current = null;
      return;
    }

    const diff =
      lastWeightRef.current !== null
        ? Math.abs(currentWeight - lastWeightRef.current)
        : 999;

    const isWithinTolerance = diff <= 0.1;

    if (!isWithinTolerance) {
      setIsStable(false);
      setStabilityProgress(0);
      if (stableTimerRef.current) {
        clearInterval(stableTimerRef.current);
        stableTimerRef.current = null;
      }
    }

    if (isWithinTolerance && !stableTimerRef.current) {
      setIsStable(true);
      let progress = 0;

      stableTimerRef.current = setInterval(() => {
        progress += 10;
        setStabilityProgress(Math.min(progress, 100));
        if (progress >= 100) {
          setLockedWeight(activeWeightRef.current);
          clearInterval(stableTimerRef.current);
          stableTimerRef.current = null;
        }
      }, 100);
    }

    lastWeightRef.current = currentWeight;
  }, [currentWeight, isConnected, isSimulating, lockedWeight]);

  useEffect(() => {
    return () => {
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
    };
  }, []);

  const unlockWeight = useCallback(() => {
    setLockedWeight(null);
    setIsStable(false);
    setStabilityProgress(0);
    lastWeightRef.current = null;
    if (stableTimerRef.current) clearInterval(stableTimerRef.current);
  }, []);

  const manualLock = useCallback(() => {
    if (currentWeight > 0) {
      setLockedWeight(currentWeight);
      setIsStable(true);
      setStabilityProgress(100);
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
    }
  }, [currentWeight]);

  // -- Minimal Simulation --
  const simTimerRef = useRef(null);
  const simTargetRef = useRef(0);

  const toggleSimulation = () => {
    setIsSimulating((prev) => {
      if (prev) {
        clearInterval(simTimerRef.current);
        setCurrentWeight(null);
        setIsConnected(false);
      } else {
        setIsConnected(true);
        simTimerRef.current = setInterval(() => {
          setCurrentWeight((prevW) => {
            const w = prevW || 0;
            const diff = simTargetRef.current - w;
            if (Math.abs(diff) < 0.1)
              return simTargetRef.current + (Math.random() - 0.5) * 0.1;
            return w + diff * 0.2;
          });
        }, 100);
      }
      return !prev;
    });
  };

  const setSimulatedTarget = (w) => {
    simTargetRef.current = parseFloat(w) || 0;
    unlockWeight();
  };

  const stabilizeSimulation = () => {
    setCurrentWeight(simTargetRef.current);
  };

  return {
    isConnected,
    isConnecting,
    isSupported,
    currentWeight,
    lockedWeight,
    isStable,
    stabilityProgress,
    error,
    connect,
    disconnect,
    autoConnect,
    unlockWeight,
    manualLock,
    isSimulating,
    toggleSimulation,
    setSimulatedTarget,
    stabilizeSimulation,
    debugLogs,
    clearDebugLogs,
    addLog,
  };
};
