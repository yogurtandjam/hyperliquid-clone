"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  method: string;
  subscription?: {
    type: string;
    coin?: string;
    user?: string;
  };
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (message: WebSocketMessage) => void;
  subscribe: (type: string, params?: any) => void;
  unsubscribe: (type: string, params?: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const messageQueue = useRef<WebSocketMessage[]>([]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected, queuing message');
      messageQueue.current.push(message);
      return;
    }

    try {
      ws.current.send(JSON.stringify(message));
      console.log('Sent WebSocket message:', message);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }, []);

  const subscribe = useCallback((type: string, params?: any) => {
    const subscriptionMessage: WebSocketMessage = {
      method: 'subscribe',
      subscription: {
        type,
        ...params,
      },
    };
    sendMessage(subscriptionMessage);
  }, [sendMessage]);

  const unsubscribe = useCallback((type: string, params?: any) => {
    const unsubscribeMessage: WebSocketMessage = {
      method: 'unsubscribe',
      subscription: {
        type,
        ...params,
      },
    };
    sendMessage(unsubscribeMessage);
  }, [sendMessage]);

  const connect = useCallback(() => {
    try {
      console.log('Connecting to Hyperliquid WebSocket...');
      ws.current = new WebSocket('wss://api.hyperliquid.xyz/ws');

      ws.current.onopen = () => {
        console.log('✅ Connected to Hyperliquid WebSocket');
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Send queued messages
        messageQueue.current.forEach(msg => sendMessage(msg));
        messageQueue.current = [];

        // Subscribe to default perpetuals data
        setTimeout(() => {
          // Subscribe to all mids (current prices)
          subscribe('allMids');
          // Subscribe to level 2 book for HYPE
          subscribe('l2Book', { coin: 'HYPE' });
          // Subscribe to trades for HYPE
          subscribe('trades', { coin: 'HYPE' });
        }, 100);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types from Hyperliquid
          if (data.channel) {
            setLastMessage(data);
          } else if (data.data) {
            // Handle subscription data
            setLastMessage({
              channel: data.subscription?.type || 'unknown',
              data: data.data
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const timeout = Math.pow(2, reconnectAttempts.current) * 1000;
          console.log(`Attempting to reconnect in ${timeout}ms...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, timeout);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }, [sendMessage, subscribe]);

  useEffect(() => {
    // Only connect on client side
    if (typeof window !== 'undefined') {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
  };
}
