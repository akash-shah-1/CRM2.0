import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export type ActivityType = 'project' | 'document' | 'client' | 'team' | 'communication' | 'note';

export interface ActivityData {
  userId: string;
  userName: string;
  action: string;
  target: string;
  type: ActivityType;
  projectId?: string;
  metadata?: any;
}

export async function logActivity(data: ActivityData) {
  try {
    await addDoc(collection(db, 'activity'), {
      ...data,
      timestamp: serverTimestamp()
    });

    // Also optionally create a notification for relevant users
    // For now, we'll just log the activity
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
