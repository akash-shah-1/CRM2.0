import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging } from './firebase';
import { UserProfile } from '../types/auth';

const VAPID_KEY = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(user: UserProfile) {
  if (!messaging) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });

      if (token) {
        console.log('FCM Token:', token);
        // Save token to user profile
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        return token;
      }
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
  }
  return null;
}

export function onMessageListener(callback: (payload: any) => void) {
  if (!messaging) return null;
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}
