import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { showToast } from "@/shared/utils/toast";

// ========================================
// CONSTANTS
// ========================================
const RFID_SOCKET_URL = "ws://192.168.1.39:9999";
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 5000;

// ========================================
// HOOK
// ========================================
export const useRFIDWebSocket = (options = {}) => {
  const {
    enabled = true,
    autoConnect = true,
    onRfidScan,
    onConnectionChange,
  } = options;

  // ========================================
  // STATE
  // ========================================
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // ========================================
  // REFS
  // ========================================
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);
  const connectionTimeoutRef = useRef(null);

  // ========================================
  // CLEAR TIMEOUTS
  // ========================================
  const clearTimeouts = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // ========================================
  // CLEANUP SOCKET
  // ========================================
  const cleanupSocket = useCallback(() => {
    clearTimeouts();
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [clearTimeouts]);

  // ========================================
  // CONNECT TO WEBSOCKET
  // ========================================
  const connect = useCallback(() => {
    if (!enabled || socketRef.current || !isMountedRef.current) return;

    setIsConnecting(true);
    setError(null);

    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnected) {
        setError("RFID Edge Service timeout");
        cleanupSocket();
      }
    }, CONNECTION_TIMEOUT);

    const socket = io(RFID_SOCKET_URL, {
      transports: ["websocket"],
      reconnection: false, 
    });

    // ========================================
    // EVENT: connect
    // ========================================
    socket.on("connect", () => {
      if (!isMountedRef.current) return;

      clearTimeouts();

      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempt(0);
      setError(null);

      console.log("✅ RFID WebSocket connected");
      showToast.success("RFID reader terhubung", { duration: 2000 });
      
      onConnectionChange?.(true);
    });

    // ========================================
    // EVENT: rfid-detected
    // ========================================
    socket.on("rfid-detected", (data) => {
      if (!isMountedRef.current) return;
      
      console.log("🏷️ RFID detected:", data);
      
      setLastScan(data); 
      onRfidScan?.(data); 
    });

    // ========================================
    // EVENT: disconnect
    // ========================================
    socket.on("disconnect", (reason) => {
      if (!isMountedRef.current) return;

      console.warn("⚠️ RFID disconnected:", reason);
      
      cleanupSocket();
      onConnectionChange?.(false);

      if (
        enabled &&
        shouldReconnectRef.current &&
        reconnectAttempt < MAX_RECONNECT_ATTEMPTS
      ) {
        console.log(`🔄 Reconnecting... (Attempt ${reconnectAttempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        setTimeout(() => {
          setReconnectAttempt((p) => p + 1);
          connect();
        }, RECONNECT_DELAY);
      } else {
        setError("RFID Edge tidak dapat terhubung");
        showToast.error(
          "RFID Edge tidak dapat terhubung. Pastikan service berjalan.",
          { duration: 5000 }
        );
      }
    });

    // ========================================
    // EVENT: rfid-error
    // ========================================
    socket.on("rfid-error", (err) => {
      if (!isMountedRef.current) return;

      console.error("❌ RFID Error:", err);
      showToast.error(`RFID Error: ${err}`, { duration: 5000 });
      setError("Koneksi RFID gagal");

      cleanupSocket();

      if (
        enabled &&
        shouldReconnectRef.current &&
        reconnectAttempt < MAX_RECONNECT_ATTEMPTS
      ) {
        setTimeout(() => {
          setReconnectAttempt((p) => p + 1);
          connect();
        }, RECONNECT_DELAY);
      } else {
        showToast.error("RFID Error: Maksimal percobaan reconnect tercapai", {
          duration: 5000,
        });
      }
    });

    // ========================================
    // EVENT: traffic-light-changed (feedback)
    // ========================================
    socket.on("traffic-light-changed", (data) => {
      console.log("🚦 Traffic light changed:", data.status);
    });

    socketRef.current = socket;
  }, [
    enabled,
    reconnectAttempt,
    onRfidScan,
    onConnectionChange,
    isConnected,
    clearTimeouts,
    cleanupSocket,
  ]);

  // ========================================
  // SEND TRAFFIC LIGHT COMMAND
  // ========================================
  const sendTrafficLight = useCallback(
    (color) => {
      if (!enabled || !socketRef.current?.connected) {
        console.warn("⚠️ Cannot send traffic light - Socket not connected");
        return false;
      }

      const payload = {
        command: 'traffic-light',
        color: color,
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit("traffic-light-control", payload);
      console.log(`🚦 Traffic light command sent: ${color}`);
      
      return true;
    },
    [enabled]
  );

  // ========================================
  // SEND PROCESSING STATUS
  // ========================================
  const sendProcessingStatus = useCallback(
    (stage, data = {}) => {
      if (!enabled || !socketRef.current?.connected) {
        console.warn("⚠️ Cannot send processing status - Socket not connected");
        return false;
      }

      const payload = {
        command: 'processing-status',
        stage: stage, 
        data: data,
        timestamp: new Date().toISOString()
      };

      socketRef.current.emit("processing-status", payload);
      console.log(`📡 Processing status sent: ${stage}`, data);
      
      return true;
    },
    [enabled]
  );

  // ========================================
  // DISCONNECT
  // ========================================
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanupSocket();
    setReconnectAttempt(0);
    setError(null);
  }, [cleanupSocket]);

  // ========================================
  // RECONNECT
  // ========================================
  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setReconnectAttempt(0);
    setTimeout(connect, 500);
  }, [disconnect, connect]);

  // ========================================
  // CLEAR LAST SCAN
  // ========================================
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  // ========================================
  // AUTO-CONNECT ON MOUNT
  // ========================================
  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;

    if (autoConnect && enabled) {
      const timer = setTimeout(connect, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoConnect, enabled, connect]);

  // ========================================
  // CLEANUP ON UNMOUNT
  // ========================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket]);

  // ========================================
  // RETURN API
  // ========================================
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
    clearLastScan,
    
    sendTrafficLight,
    sendProcessingStatus,
  };
};