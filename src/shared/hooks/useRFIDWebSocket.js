import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { showToast } from "@/shared/utils/toast";

const RFID_SOCKET_URL = "ws://192.168.1.54:9999";
const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 5000;

/**
 * Hook Socket.IO untuk RFID Edge Service
 */
export const useRFIDWebSocket = (options = {}) => {
  const {
    enabled = true,
    autoConnect = true,
    onRfidScan,
    onConnectionChange,
  } = options;

  // =========================
  // STATE
  // =========================
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // =========================
  // REFS
  // =========================
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);
  const connectionTimeoutRef = useRef(null);
  
  // ✅ TAMBAHAN: Ref untuk tracking apakah scan sudah diaktifkan
  const scanEnabledRef = useRef(false);

  // =========================
  // CLEAR TIMEOUT
  // =========================
  const clearTimeouts = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // =========================
  // DISCONNECT (Internal cleanup)
  // =========================
  const cleanupSocket = useCallback(() => {
    clearTimeouts();
    
    // ✅ Reset scan enabled saat disconnect
    scanEnabledRef.current = false;
    
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, [clearTimeouts]);

  // =========================
  // CONNECT
  // =========================
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

    socket.on("connect", () => {
      if (!isMountedRef.current) return;

      clearTimeouts();

      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempt(0);
      setError(null);
      
      // ✅ Reset scan enabled saat baru connect
      scanEnabledRef.current = false;

      showToast.success("RFID reader terhubung", { duration: 2000 });
      onConnectionChange?.(true);
    });

    // ✅ FIXED: Filter data RFID berdasarkan scan enabled
    socket.on("rfid-detected", (data) => {
      if (!isMountedRef.current) return;
      
      
      // ✅ Hanya terima data kalau scan sudah diaktifkan
      if (!scanEnabledRef.current) {
        console.warn("⚠️ RFID data diabaikan - Weight belum locked");
        showToast.warning("Weight harus di-lock terlebih dahulu", { 
          duration: 2000 
        });
        return;
      }
      
      setLastScan(data); 
      onRfidScan?.(data); 
    });

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

  // =========================
  // SEND WEIGHT STABLE
  // =========================
  const sendWeightStable = useCallback(
    (isStable) => {
      if (!enabled || !socketRef.current?.connected) {
        console.warn("⚠️ Cannot send weight stable - Socket not connected");
        return;
      }

      scanEnabledRef.current = isStable;
      
      socketRef.current.emit("start-scan", isStable);
    },
    [enabled]
  );

  // =========================
  // DISCONNECT (Manual)
  // =========================
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanupSocket();
    setReconnectAttempt(0);
    setError(null);
  }, [cleanupSocket]);

  // =========================
  // RECONNECT
  // =========================
  const reconnect = useCallback(() => {
    disconnect();
    shouldReconnectRef.current = true;
    setReconnectAttempt(0);
    setTimeout(connect, 500);
  }, [disconnect, connect]);

  // =========================
  // CLEAR LAST SCAN
  // =========================
  const clearLastScan = useCallback(() => {
    setLastScan(null);
  }, []);

  // =========================
  // AUTO CONNECT
  // =========================
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
  }, []);

  // =========================
  // CLEANUP
  // =========================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      cleanupSocket();
    };
  }, [cleanupSocket]);

  // =========================
  // RETURN
  // =========================
  return {
    isConnected,
    isConnecting,
    lastScan,
    error,
    reconnectAttempt,

    connect,
    disconnect,
    reconnect,
    sendWeightStable,
    clearLastScan,
  };
};