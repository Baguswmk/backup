import { useState, useEffect, useRef, useCallback, useReducer } from "react";

const WEIGHT_PATTERNS = [
  // AD-4329A format: ST,GS,+0002360kg or ST,GS,+0002360.50kg
  /ST,GS,[+-]?(\d+\.?\d*)\s*kg/i,
  // Generic patterns
  /[+-]?(\d+\.?\d*)\s*(?:kg|KG|Kg)/,
  /W:\s*(\d+\.?\d*)/,
  /NET:\s*(\d+\.?\d*)/,
  /WEIGHT:\s*(\d+\.?\d*)/,
];

const MAX_FRAMING_ERRORS = 10; // Max consecutive framing errors before reconnect
const FRAMING_ERROR_RESET_TIME = 5000; // Reset counter after 5 seconds
const RECONNECT_DELAY = 2000; // Wait 2 seconds before auto-reconnect

export const useWebSerialScale = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const weightDataRef = useRef({
    currentWeight: null,
    lastUpdate: null,
    rawData: null,
  });

  const portRef = useRef(null);
  const readerRef = useRef(null);
  const readLoopRef = useRef(false);
  const isMountedRef = useRef(true);
  const autoConnectAttemptedRef = useRef(false);
  
  // Error tracking
  const framingErrorCountRef = useRef(0);
  const lastFramingErrorTimeRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);

  const parseWeight = useCallback((rawData) => {
    if (!rawData) return null;
    
    for (const pattern of WEIGHT_PATTERNS) {
      const match = rawData.match(pattern);
      if (match) {
        try {
          const weight = parseFloat(match[1]);
          if (weight >= 0 && weight <= 99999.9) {
            return Math.round(weight * 100) / 100;
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  }, []);

  // Clean disconnect
  const cleanDisconnect = useCallback(async () => {
    
    readLoopRef.current = false;

    // Cancel reader first
    if (readerRef.current) {
        await readerRef.current.cancel();
      
        readerRef.current.releaseLock();
      
      readerRef.current = null;
    }

    if (portRef.current) {
      let retries = 3;
      while (retries > 0) {
        try {
          await portRef.current.close();
          break;
        } catch (e) {
          retries--;
          if (retries === 0) {
            console.error('❌ Failed to close port after retries:', e.message);
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      portRef.current = null;
    }

    // Reset error counters
    framingErrorCountRef.current = 0;
    lastFramingErrorTimeRef.current = null;
    
    setIsConnected(false);
  }, []);

  // Auto-reconnect on framing errors
  const handleAutoReconnect = useCallback(async () => {
    if (isReconnectingRef.current || !isMountedRef.current) return;
    
    isReconnectingRef.current = true;
    
    await cleanDisconnect();
    
    await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
    
    if (isMountedRef.current) {
      try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          await connectToPort(ports[0]);
        }
      } catch (error) {
        console.error('❌ Auto-reconnect failed:', error.message);
        setError('Koneksi terputus. Klik Connect untuk menghubungkan kembali.');
      }
    }
    
    isReconnectingRef.current = false;
  }, [cleanDisconnect]);

  const readLoop = useCallback(async (port) => {
    readLoopRef.current = true;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!port.readable) {
        console.error('❌ Port readable is null!');
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
          
          if (done || !isMountedRef.current) {
            break;
          }
          
          const text = textDecoder.decode(value, { stream: true });
          buffer += text;
          
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            const weight = parseWeight(line);
            
            if (weight !== null) {
              weightDataRef.current = {
                currentWeight: weight,
                lastUpdate: new Date().toISOString(),
                rawData: line,
              };
              
              // Reset framing error counter on successful read
              framingErrorCountRef.current = 0;
              lastFramingErrorTimeRef.current = null;
              
              if (isMountedRef.current) {
                forceUpdate();
              }
            }
          }
        } catch (readError) {
          // Handle FramingError specifically
          if (readError.name === 'FramingError') {
            const now = Date.now();
            
            // Reset counter if last error was more than FRAMING_ERROR_RESET_TIME ago
            if (lastFramingErrorTimeRef.current && 
                (now - lastFramingErrorTimeRef.current) > FRAMING_ERROR_RESET_TIME) {
              framingErrorCountRef.current = 0;
            }
            
            framingErrorCountRef.current++;
            lastFramingErrorTimeRef.current = now;
            
            // Only log every 5th error to reduce console spam
            if (framingErrorCountRef.current % 5 === 1) {
              console.warn(`⚠️ FramingError detected (${framingErrorCountRef.current}/${MAX_FRAMING_ERRORS})`);
            }
            
            // Auto-reconnect if too many errors
            if (framingErrorCountRef.current >= MAX_FRAMING_ERRORS) {
              console.error(`❌ Too many framing errors (${framingErrorCountRef.current}), reconnecting...`);
              handleAutoReconnect();
              break;
            }
            
            // Continue reading despite framing error
            await new Promise(resolve => setTimeout(resolve, 50));
            continue;
          }
          
          // Handle NetworkError (port disconnected)
          if (readError.name === 'NetworkError') {
            console.error('❌ Network error - device disconnected');
            break;
          }
          
          // Other errors
          console.error("❌ Read error:", readError.name, readError.message);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
    } catch (error) {
      console.error("❌ Read loop error:", error);
      setError(`Read error: ${error.message}`);
    } finally {
        if (readerRef.current) {
        try {
          await readerRef.current.cancel();
          readerRef.current.releaseLock();
        } catch (e) {
          // Ignore cleanup errors
        }
        readerRef.current = null;
      }
    }
  }, [parseWeight, handleAutoReconnect]);

  const connectToPort = useCallback(async (port) => {
    try {
      // Ensure port is closed first
      try {
        if (port.readable || port.writable) {
          await port.close();
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (e) {
        // Port might already be closed
      }

      await port.open({
        baudRate: 2400,
        dataBits: 7,
        stopBits: 1,
        parity: "even",
        bufferSize: 1024, // Add buffer size
      });

      portRef.current = port;
      setIsConnected(true);
      setError(null);
      framingErrorCountRef.current = 0;
      
      readLoop(port);
      
      return { success: true };
    } catch (error) {
      console.error("❌ Connection error:", error);
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
      console.error("Connection error:", error);
      if (error.name === 'NotFoundError') {
        // User cancelled the selection
        setError(null);
      } else {
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
    
    weightDataRef.current = {
      currentWeight: null,
      lastUpdate: null,
      rawData: null,
    };
    
    if (isMountedRef.current) {
      forceUpdate();
    }
  }, [cleanDisconnect]);

  // Auto-connect to previously granted ports
  const autoConnect = useCallback(async () => {
    if (!navigator.serial || autoConnectAttemptedRef.current) return;

    autoConnectAttemptedRef.current = true;

    try {
      const ports = await navigator.serial.getPorts();
      
      if (ports.length > 0) {
        const port = ports[0];
        await connectToPort(port);
      }
    } catch (error) {
      //
    }
  }, [connectToPort]);

  // Handle disconnect events
  useEffect(() => {
    const handleDisconnect = async (event) => {
      if (portRef.current === event.target) {
        setIsConnected(false);
        setError("Timbangan terputus dari komputer");
        
        await cleanDisconnect();
        
        weightDataRef.current = {
          currentWeight: null,
          lastUpdate: null,
          rawData: null,
        };
        
        if (isMountedRef.current) {
          forceUpdate();
        }
      }
    };

    if (navigator.serial) {
      navigator.serial.addEventListener('disconnect', handleDisconnect);
      return () => {
        navigator.serial.removeEventListener('disconnect', handleDisconnect);
      };
    }
  }, [cleanDisconnect]);

  // Initialize and auto-connect on mount
  useEffect(() => {
    setIsSupported('serial' in navigator);
    isMountedRef.current = true;
    
    // Try to auto-connect after a short delay
    const timer = setTimeout(() => {
      autoConnect();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      isMountedRef.current = false;
      cleanDisconnect();
    };
  }, [autoConnect, cleanDisconnect]);

  return {
    isConnected,
    isConnecting,
    isSupported,
    currentWeight: weightDataRef.current.currentWeight,
    lastUpdate: weightDataRef.current.lastUpdate,
    rawData: weightDataRef.current.rawData,
    error,
    connect,
    disconnect,
    autoConnect,
  };
};