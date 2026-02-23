import { useState, useEffect, useRef, useCallback, useReducer } from "react";

const RFID_PATTERNS = [
  /RFID:\s*([A-Z0-9]+)/i,
  /TAG:\s*([A-Z0-9]+)/i,
  /ID:\s*([A-Z0-9]+)/i,
  /([A-Z0-9]{8,16})/,
];

export const useRFIDWebSerial = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const rfidDataRef = useRef({
    lastScan: null,
    lastUpdate: null,
    rawData: null,
  });

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const readLoopRef = useRef(false);
  const isMountedRef = useRef(true);
  const autoConnectAttemptedRef = useRef(false);
  const scanEnabledRef = useRef(false);

  const parseRFID = useCallback((rawData) => {
    if (!rawData) return null;
    
    for (const pattern of RFID_PATTERNS) {
      const match = rawData.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }, []);

  const cleanDisconnect = useCallback(async () => {
    readLoopRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      } catch (e) {
        // Ignore
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (e) {
        // Ignore
      }
      portRef.current = null;
    }

    scanEnabledRef.current = false;
    setIsConnected(false);
  }, []);

  const readLoop = useCallback(async (port) => {
    readLoopRef.current = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!port.readable) {
        setError('Port readable stream is null');
        return;
      }
      
      const textDecoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
      const reader = port.readable.getReader();
      readerRef.current = reader;
      
      let buffer = '';
      
      while (readLoopRef.current && isMountedRef.current) {
        try {
          const { value, done } = await reader.read();
          
          if (done || !isMountedRef.current) break;
          
          const text = textDecoder.decode(value, { stream: true });
          buffer += text;
          
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim() || !scanEnabledRef.current) continue;
            
            const rfidTag = parseRFID(line);
            
            if (rfidTag) {
              rfidDataRef.current = {
                lastScan: rfidTag,
                lastUpdate: new Date().toISOString(),
                rawData: line,
              };
              
              if (isMountedRef.current) {
                forceUpdate();
              }
            }
          }
        } catch (readError) {
          if (readError.name === 'NetworkError') break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error("❌ RFID Read loop error:", error);
      setError(`Read error: ${error.message}`);
    } finally {
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
          readerRef.current.releaseLock();
        } catch (e) {
          // Ignore
        }
        readerRef.current = null;
      }
    }
  }, [parseRFID]);

  const connectToPort = useCallback(async (port) => {
    try {
      try {
        if (port.readable || port.writable) {
          await port.close();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (e) {
        // Port might already be closed
      }

      await port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
      });

      portRef.current = port;
      setIsConnected(true);
      setError(null);
      scanEnabledRef.current = false;
      
      readLoop(port);
      
      return { success: true };
    } catch (error) {
      console.error("❌ RFID Connection error:", error);
      setError(`Connection error: ${error.message}`);
      setIsConnected(false);
      return { success: false, error: error.message };
    }
  }, [readLoop]);

  const connect = useCallback(async () => {
    if (!navigator.serial) {
      setError("WebSerial tidak didukung. Gunakan Chrome/Edge 89+");
      return { success: false };
    }

    setIsConnecting(true);
    setError(null);

    try {
      const port = await navigator.serial.requestPort();
      const result = await connectToPort(port);
      return result;
    } catch (error) {
      if (error.name !== 'NotFoundError') {
        setError(`Connection error: ${error.message}`);
      }
      setIsConnected(false);
      return { success: false, error: error.message };
    } finally {
      setIsConnecting(false);
    }
  }, [connectToPort]);

  const disconnect = useCallback(async () => {
    await cleanDisconnect();
    
    rfidDataRef.current = {
      lastScan: null,
      lastUpdate: null,
      rawData: null,
    };
    
    if (isMountedRef.current) {
      forceUpdate();
    }
  }, [cleanDisconnect]);

  const autoConnect = useCallback(async () => {
    if (!navigator.serial || autoConnectAttemptedRef.current) return;

    autoConnectAttemptedRef.current = true;

    try {
      const ports = await navigator.serial.getPorts();
      
      if (ports.length > 0) {
        const rfidPort = ports[1] || ports[0];
        await connectToPort(rfidPort);
      }
    } catch (error) {
      // Silent fail
    }
  }, [connectToPort]);

  const enableScanning = useCallback((enabled) => {
    scanEnabledRef.current = enabled;
  }, []);

  const clearLastScan = useCallback(() => {
    rfidDataRef.current = {
      lastScan: null,
      lastUpdate: null,
      rawData: null,
    };
    forceUpdate();
  }, []);

  useEffect(() => {
    setIsSupported('serial' in navigator);
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      cleanDisconnect();
    };
  }, [cleanDisconnect]);

  return {
    isConnected,
    isConnecting,
    isSupported,
    lastScan: rfidDataRef.current.lastScan,
    lastUpdate: rfidDataRef.current.lastUpdate,
    rawData: rfidDataRef.current.rawData,
    error,
    connect,
    disconnect,
    autoConnect,
    enableScanning,
    clearLastScan,
  };
};