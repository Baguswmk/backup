import { useState, useEffect, useCallback, useRef } from "react";
import { showToast } from "@/shared/utils/toast";

const RFID_WS_URL = "ws://localhost:9999";
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 5000;

/**
 * Hook untuk koneksi WebSocket ke RFID Edge Service
 */
export const useRFIDWebSocket = (options = {}) => {
  const {
    enabled = true,
    autoConnect = true,
    onRfidScan,
    onConnectionChange,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Refs
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastScanTimeRef = useRef(0);
  const isConnectingRef = useRef(false);
  const autoConnectInitiatedRef = useRef(false);
  const shouldReconnectRef = useRef(true);

  /**
   * 🧹 Clear all timeouts
   */
  const clearAllTimeouts = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * 🔌 Connect ke RFID Edge Service
   */
  const connect = useCallback(() => {
    // Guard: Check if enabled
    if (!enabled) {
      return;
    }

    // Guard: Already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Guard: Connection in progress
    if (isConnectingRef.current) {
      return;
    }

    // Guard: Check if mounted
    if (!isMountedRef.current) {
      return;
    }

    
    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);

    clearAllTimeouts();

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected && wsRef.current?.readyState !== WebSocket.OPEN) {
        console.error("⏱️ Connection timeout");
        
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch (e) {
            // Ignore close errors
          }
          wsRef.current = null;
        }

        setIsConnecting(false);
        isConnectingRef.current = false;
        setError("RFID Edge Service tidak merespon (timeout)");

        // Only show toast on first attempt
        if (reconnectAttempt === 0 && isMountedRef.current) {
          showToast.error("RFID Edge Service tidak dapat dijangkau", {
            duration: 3000,
          });
        }
      }
    }, CONNECTION_TIMEOUT);

    try {
      const ws = new WebSocket(RFID_WS_URL);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        
        clearAllTimeouts();

        setIsConnected(true);
        setIsConnecting(false);
        isConnectingRef.current = false;
        setReconnectAttempt(0);
        setError(null);

        showToast.success("RFID reader terhubung", { duration: 2000 });

        if (onConnectionChange) {
          onConnectionChange(true);
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);

          if (data.type === "rfid:scan") {
            // Anti-duplicate protection
            const now = Date.now();
            if (now - lastScanTimeRef.current < 2000) {
              console.warn("🚫 Duplicate scan prevented (< 2s)");
              return;
            }
            lastScanTimeRef.current = now;

            const scanData = {
              epc: data.epc,
              timestamp: data.timestamp,
              received: new Date().toISOString(),
            };

            setLastScan(scanData);

            if (onRfidScan) {
              onRfidScan(scanData);
            }
          } 
        } catch (error) {
          console.error("❌ RFID message parse error:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ RFID WS error:", error);
        
        clearAllTimeouts();

        if (ws.readyState !== WebSocket.CLOSED) {
          setError("Koneksi error - pastikan RFID Edge Service berjalan");
        }
      };

      ws.onclose = (event) => {
        if (!isMountedRef.current) return;

        console.warn("⚠️ RFID Edge disconnected", {
          code: event.code,
          reason: event.reason || "No reason provided",
        });

        clearAllTimeouts();

        setIsConnected(false);
        setIsConnecting(false);
        isConnectingRef.current = false;

        if (onConnectionChange) {
          onConnectionChange(false);
        }

        // Set error message
        if (event.code === 1006) {
          setError("RFID Edge Service tidak tersedia");
        } else {
          setError(`Koneksi terputus (code: ${event.code})`);
        }

        // Auto-reconnect logic
        if (
          enabled &&
          isMountedRef.current &&
          shouldReconnectRef.current &&
          reconnectAttempt < MAX_RECONNECT_ATTEMPTS
        ) {
      

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && shouldReconnectRef.current) {
              setReconnectAttempt((prev) => prev + 1);
              connect();
            }
          }, RECONNECT_DELAY);
        } else if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
          console.error("❌ Max reconnect attempts reached");
          setError("RFID Edge tidak dapat terhubung");
          shouldReconnectRef.current = false;
          
          if (isMountedRef.current) {
            showToast.error(
              "RFID Edge tidak dapat terhubung. Pastikan service berjalan.",
              { duration: 5000 }
            );
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ RFID connection error:", error);
      
      clearAllTimeouts();

      setError(error.message);
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, [enabled, onRfidScan, onConnectionChange, reconnectAttempt, isConnected, clearAllTimeouts]);

  /**
   * 📡 Kirim weight stable status ke RFID Edge
   */
  const sendWeightStable = useCallback(
    (isStable) => {
      if (!enabled || wsRef.current?.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const message = {
          type: "weight:stable",
          value: isStable,
        };
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("❌ Failed to send weight stable:", error);
      }
    },
    [enabled]
  );

  /**
   * 🔌 Disconnect dari RFID Edge
   */
  const disconnect = useCallback(() => {

    shouldReconnectRef.current = false;
    clearAllTimeouts();

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    isConnectingRef.current = false;
    setReconnectAttempt(0);
    setError(null);
  }, [clearAllTimeouts]);

  /**
   * 🔄 Manual reconnect
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      shouldReconnectRef.current = true;
      setReconnectAttempt(0);
      autoConnectInitiatedRef.current = false;
      connect();
    }, 500);
  }, [disconnect, connect]);

  /**
   * 🧹 Clear last scan data
   */
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  /**
   * 🎣 Effect: Auto-connect on mount (ONCE)
   */
  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;

    // Only auto-connect once
    if (autoConnect && enabled && !autoConnectInitiatedRef.current) {
      autoConnectInitiatedRef.current = true;
      
      // Delay to prevent race conditions
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          connect();
        }
      }, 1000);

      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
      };
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty deps - only run once!

  /**
   * 🧹 Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      clearAllTimeouts();
      
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (e) {
          // Ignore
        }
        wsRef.current = null;
      }
    };
  }, [clearAllTimeouts]);

  /**
   * 📊 Return state & methods
   */
  return {
    // State
    isConnected,
    isConnecting,
    lastScan,
    error,
    reconnectAttempt,

    // Methods
    connect,
    disconnect,
    reconnect,
    sendWeightStable,
    clearLastScan,
  };
};