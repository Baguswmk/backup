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

// HW-VX Series Protocol Utils
const BAUD_RATE = 57600;
const CMD_INVENTORY = 0x01;

function calcCRC(data) {
  let value = 0xffff;
  for (const byte of data) {
    value ^= byte;
    for (let i = 0; i < 8; i++) {
      value = value & 1 ? (value >> 1) ^ 0x8408 : value >> 1;
    }
  }
  return value;
}

function buildCommand(cmd, address = 0xff, data = []) {
  const base = [4 + data.length, address, cmd, ...data];
  const crc = calcCRC(new Uint8Array(base));
  return new Uint8Array([...base, crc & 0xff, (crc >> 8) & 0xff]);
}

export const useRFIDWebSerial = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const isScanningRef = useRef(false);
  const isConnectedRef = useRef(false);
  const portRef = useRef(null);
  const writerRef = useRef(null);
  const rxBuffer = useRef(new Uint8Array(0));
  const active = useRef(false);

  const addLog = useCallback((type, msg) => {
    const time = new Date().toISOString().split("T")[1].slice(0, -1);
    setDebugLogs((prev) => [...prev.slice(-99), { ts: time, type, msg }]);
  }, []);

  const clearDebugLogs = useCallback(() => setDebugLogs([]), []);

  const enableScanning = useCallback((enabled) => {
    setIsScanning(enabled);
    isScanningRef.current = enabled;
  }, []);

  const readLoop = async (port) => {
    while (port.readable && active.current) {
      const reader = port.readable.getReader();
      setCoordinatorConnection("rfid", port, reader, writerRef.current);

      try {
        while (active.current) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const merged = new Uint8Array(
              rxBuffer.current.length + value.length,
            );
            merged.set(rxBuffer.current);
            merged.set(value, rxBuffer.current.length);
            rxBuffer.current = merged;
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          addLog("error", "Read error: " + err.message);
        }
      } finally {
        setCoordinatorConnection("rfid", port, null, writerRef.current);
        try {
          reader.releaseLock();
        } catch (_) {}
      }
    }
  };

  const readExact = async (n, timeoutMs = 600) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (rxBuffer.current.length >= n) {
        const res = rxBuffer.current.slice(0, n);
        rxBuffer.current = rxBuffer.current.slice(n);
        return res;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    return null;
  };

  const sendCommand = async (bytes) => {
    if (writerRef.current) await writerRef.current.write(bytes);
  };

  const doInventory = async () => {
    try {
      await sendCommand(buildCommand(CMD_INVENTORY));
      const lenByte = await readExact(1, 600);
      if (!lenByte) return [];

      const body = await readExact(lenByte[0], 600);
      if (!body) return [];

      const frame = new Uint8Array(1 + body.length);
      frame[0] = lenByte[0];
      frame.set(body, 1);

      if (frame.length < 6 || frame[3] !== 0x00) return [];

      const data = frame.slice(4, -2);
      if (data.length === 0) return [];

      const tags = [];
      let ptr = 1;
      for (let n = 0; n < data[0] && ptr < data.length; n++) {
        const tagLen = data[ptr];
        const tagBytes = data.slice(ptr + 1, ptr + 1 + tagLen);
        ptr += 1 + tagLen;
        if (tagBytes.length > 0) {
          tags.push(
            Array.from(tagBytes)
              .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
              .join(""),
          );
        }
      }
      return tags;
    } catch (e) {
      return [];
    }
  };

  const pollLoop = async () => {
    while (active.current) {
      if (isScanningRef.current && isConnectedRef.current) {
        const tags = await doInventory();
        if (tags.length > 0) {
          setLastScan(tags[0]);
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const connectToPort = async (port) => {
    try {
      // 1. Force Disconnect role ini kalau ada yg masih nyangkut
      await forceDisconnect("rfid");

      // 2. Gunakan mutex coordinator untuk memastikan aman
      await openPort("rfid", () =>
        port.open({
          baudRate: BAUD_RATE,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          bufferSize: 2048,
        }),
      );

      portRef.current = port;
      writerRef.current = port.writable?.getWriter();
      rxBuffer.current = new Uint8Array(0);
      setCoordinatorConnection("rfid", port, null, writerRef.current);

      setIsConnected(true);
      isConnectedRef.current = true;
      setError(null);
      await registerPort("rfid", port);
      addLog("connect", "RFID terhubung");

      active.current = true;
      readLoop(port);

      // Allow hardware to settle, consume dirty data, then clear
      await new Promise((r) => setTimeout(r, 150));
      rxBuffer.current = new Uint8Array(0);

      pollLoop();
      return { success: true };
    } catch (err) {
      setIsConnected(false);
      isConnectedRef.current = false;
      setError("Gagal hubung RFID: " + err.message);
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
    active.current = false;
    await forceDisconnect("rfid");
    unregisterPort("rfid");
    setIsConnected(false);
    isConnectedRef.current = false;
    enableScanning(false);
    setLastScan(null);
    writerRef.current = null;
    portRef.current = null;
    addLog("disconnect", "Disconnected");
  };

  const autoConnect = async () => {
    if (hasSavedPort("rfid")) {
      const port = await findSavedPort("rfid");
      if (port) connectToPort(port);
    }
  };

  useEffect(() => {
    setIsSupported("serial" in navigator);
    const timer = setTimeout(() => autoConnect(), 500);
    return () => {
      clearTimeout(timer);
      active.current = false;
      forceDisconnect("rfid");
    };
  }, []);

  const clearLastScan = () => setLastScan(null);
  const simulateScan = (tag) => {
    setLastScan(tag);
    setIsConnected(true);
    isConnectedRef.current = true;
  };

  return {
    isConnected,
    isConnecting,
    isSupported,
    lastScan,
    isScanning,
    rawData: lastScan,
    error,
    connect,
    disconnect,
    autoConnect,
    enableScanning,
    clearLastScan,
    simulateScan,
    debugLogs,
    clearDebugLogs,
    addLog,
  };
};
