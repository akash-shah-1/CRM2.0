import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotifyOptions {
  title: string;
  message: string;
  type?: NotificationType;
  userId?: string; // Target user. If omitted, might be intended for admins or everyone (depending on logic)
}

export async function createNotification({ title, message, type = 'info', userId }: NotifyOptions) {
  try {
    await addDoc(collection(db, 'notifications'), {
      title,
      message,
      type,
      userId: userId || 'admin-broadcast', // Special tag or just null
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}
