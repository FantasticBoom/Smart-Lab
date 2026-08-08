import { useEffect, useRef } from 'react';
import useAuthStore from '../store/authStore';
import apiClient from '../services/apiClient';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useActivityTracker = () => {
  const { token, logout, setAuth, user } = useAuthStore();
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!token) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    // Check inactivity and refresh token
    const intervalId = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // Inactive for 30 minutes, force logout
        logout();
      } else if (timeSinceLastActivity < REFRESH_INTERVAL) {
        // Active recently, let's refresh the token if it's nearing expiration or just periodically
        try {
          const response = await apiClient.post('/auth/refresh');
          const newToken = response.data.access_token;
          if (newToken && user) {
            setAuth(newToken, user);
          }
        } catch (error) {
          // If refresh fails (e.g. invalid token), logout
          console.error("Failed to refresh token", error);
          logout();
        }
      }
    }, REFRESH_INTERVAL);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [token, logout, setAuth, user]);
};
