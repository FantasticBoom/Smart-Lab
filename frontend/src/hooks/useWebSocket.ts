import { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;
const MAX_RECONNECT_DELAY_MS = 30_000;

export const useWebSocket = () => {
  const { token } = useAuthStore();
  const { updateDevice } = useDeviceStore();
  const ws = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef<number>(3_000);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComponentMounted = useRef(true);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (!data?.device_id) return;

        const updatePayload: Partial<import('../store/deviceStore').DeviceStatus> & { id: string } = {
          id: data.device_id,
        };

        if (data.status !== undefined) updatePayload.status = data.status;
        if (data.lock_status !== undefined) updatePayload.lock_status = data.lock_status;
        if (data.active_window !== undefined) updatePayload.active_window = data.active_window;
        if (data.open_windows !== undefined) updatePayload.open_windows = data.open_windows;

        updateDevice(updatePayload as any);
      } catch (error) {
        console.error('[WS] Message parsing error:', error);
      }
    },
    [updateDevice]
  );

  useEffect(() => {
    if (!token) return;

    if (!WS_BASE_URL) {
      console.warn(
        '[WS] VITE_WS_BASE_URL is not defined. WebSocket connection skipped.'
      );
      return;
    }

    isComponentMounted.current = true;
    reconnectDelay.current = 3_000;

    const connect = () => {
      if (!isComponentMounted.current) return;

      // Build URL inside connect() to always use current token
      const token = useAuthStore.getState().token;
      if (!token) return;

      const wsUrl = `${WS_BASE_URL}/api/v1/ws/admin?token=${token}`;

      console.log('[WS] Connecting to', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        // Reset backoff on successful connection
        reconnectDelay.current = 3_000;
      };

      ws.current.onmessage = handleMessage;

      ws.current.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`);
        ws.current = null;

        if (!isComponentMounted.current) return;

        // Exponential backoff: 3s → 6s → 12s → 24s → 30s (cap)
        console.log(`[WS] Reconnecting in ${reconnectDelay.current / 1000}s...`);
        reconnectTimeout.current = setTimeout(() => {
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 2,
            MAX_RECONNECT_DELAY_MS
          );
          connect();
        }, reconnectDelay.current);
      };

      ws.current.onerror = (error) => {
        console.error('[WS] Error:', error);
        // onclose will fire after onerror, which handles reconnect
        ws.current?.close();
      };
    };

    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [token, handleMessage]);

  return ws.current;
};
