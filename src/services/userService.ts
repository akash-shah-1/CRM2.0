import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types/auth';

export async function getAllUsers(): Promise<UserProfile[]> {
  const querySnapshot = await getDocs(collection(db, 'users'));
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
}

export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  const q = query(collection(db, 'users'), where('uid', 'in', uids));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
}
