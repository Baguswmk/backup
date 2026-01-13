// TimbanganForm/hooks/useAutoConnect.js
import { useState, useEffect, useRef } from "react";

export const useAutoConnect = ({
  shouldAutoConnect,
  wsConnected,
  isSupported,
  mode,
  autoConnect,
  onAutoConnectComplete,
}) => {
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  
  const connectionTimeoutRef = useRef(null);

  useEffect(() => {
    if (
      shouldAutoConnect &&
      !wsConnected &&
      !isAutoConnecting &&
      !autoConnectAttempted &&
      isSupported &&
      mode === "create"
    ) {
      setIsAutoConnecting(true);
      setAutoConnectAttempted(true);
      setConnectionTimeout(false);

      // Set timeout for connection
      connectionTimeoutRef.current = setTimeout(() => {
        if (!wsConnected && isAutoConnecting) {
          console.warn("⚠️ Auto-connect timeout after 5 seconds");
          setConnectionTimeout(true);
          setIsAutoConnecting(false);
        }
      }, 5000);

      // Attempt connection
      autoConnect()
        .then(() => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          setIsAutoConnecting(false);
          if (onAutoConnectComplete) {
            onAutoConnectComplete();
          }
        })
        .catch((error) => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          console.error("❌ Auto-connect error:", error);
          setIsAutoConnecting(false);
          if (onAutoConnectComplete) {
            onAutoConnectComplete();
          }
        });
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, [
    shouldAutoConnect,
    wsConnected,
    isSupported,
    mode,
    autoConnect,
    onAutoConnectComplete,
    isAutoConnecting,
    autoConnectAttempted,
  ]);

  return {
    isAutoConnecting,
    connectionTimeout,
  };
};