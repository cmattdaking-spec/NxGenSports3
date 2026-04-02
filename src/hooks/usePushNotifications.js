/**
 * usePushNotifications
 * Registers the service worker, fetches the VAPID public key,
 * subscribes for push notifications, and syncs the subscription to the backend.
 */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '@/api/apiClient';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function getVapidKey() {
  const res = await fetch('/api/push/vapid-public-key');
  const { publicKey } = await res.json();
  return publicKey;
}

async function sendSubscriptionToServer(sub, method = 'POST') {
  const token = getToken();
  const json  = sub.toJSON();
  await fetch('/api/push/subscribe', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh:   json.keys?.p256dh,
      auth:     json.keys?.auth,
    }),
  });
}

export function usePushNotifications() {
  const [permission,    setPermission]    = useState(Notification?.permission ?? 'default');
  const [subscribed,    setSubscribed]    = useState(false);
  const [swReady,       setSwReady]       = useState(false);
  const [error,         setError]         = useState(null);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

  // Register the service worker once
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => {
        setSwReady(true);
        // Check if already subscribed
        return reg.pushManager.getSubscription();
      })
      .then(existing => {
        if (existing) setSubscribed(true);
      })
      .catch(err => setError(err.message));
  }, [supported]);

  const subscribe = useCallback(async () => {
    if (!supported || !swReady) return;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const reg        = await navigator.serviceWorker.ready;
      const vapidKey   = await getVapidKey();
      const sub        = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await sendSubscriptionToServer(sub, 'POST');
      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    }
  }, [supported, swReady]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: '{}',
        });
      }
      setSubscribed(false);
    } catch (err) {
      setError(err.message);
    }
  }, [supported]);

  return { supported, permission, subscribed, swReady, error, subscribe, unsubscribe };
}
