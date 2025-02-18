import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionQuality: number;
  dimensionalLatency: number;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionQuality: 1,
  dimensionalLatency: 0
});

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState(1);
  const [dimensionalLatency, setDimensionalLatency] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const lastHeartbeatRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(0);
  const { address } = useAccount();

  const connect = () => {
    try {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      if (socket) {
        socket.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to dimensional portal:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Dimensional portal connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setConnectionQuality(1);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ 
              type: 'dimensional_ping',
              timestamp: Date.now()
            }));

            if (Date.now() - lastHeartbeatRef.current > 5000) {
              console.warn('Dimensional sync lost, reconnecting...');
              ws.close();
            }
          }
        }, 1000);

        if (address) {
          ws.send(JSON.stringify({
            type: 'dimensional_auth',
            address,
            timestamp: Date.now()
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'dimensional_error') {
            console.error('Dimensional portal error:', data.message);
          } else if (data.type === 'dimensional_pong') {
            const latency = Date.now() - lastPingRef.current;
            const quality = Math.max(0, Math.min(1, 1 - (latency / 1000)));
            setConnectionQuality(quality);
            setDimensionalLatency(latency);
            lastHeartbeatRef.current = Date.now();
          }
        } catch (error) {
          console.error('Error parsing dimensional message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Dimensional portal closed:', event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        setConnectionQuality(0);

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        if (event.code === 1000) return;

        if (reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Attempting dimensional reconnect in ${timeout}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        } else {
          console.log('Max dimensional reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('Dimensional portal error:', error);
        setConnectionQuality(0);
      };

      setSocket(ws);
    } catch (error) {
      console.error('Error creating dimensional portal:', error);
      setSocket(null);
      setIsConnected(false);
      setConnectionQuality(0);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socket) {
        socket.close(1000);
      }
    };
  }, []);

  useEffect(() => {
    if (address && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'dimensional_auth',
        address,
        timestamp: Date.now()
      }));
    }
  }, [address, socket]);

  return (
    <WebSocketContext.Provider value={{ 
      socket, 
      isConnected, 
      connectionQuality,
      dimensionalLatency 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};