import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface GlobalStats {
  totalSales: number;
  totalEarnings: number;
  totalProjects: number;
  updatedAt: any;
}

const STATS_DOC_PATH = 'system_stats/global';

export function subscribeToGlobalStats(callback: (stats: GlobalStats | null) => void) {
  const ref = doc(db, STATS_DOC_PATH);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as GlobalStats);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, STATS_DOC_PATH);
  });
}

export async function updateStatsOnProjectCompletion(price: number) {
  try {
    const ref = doc(db, STATS_DOC_PATH);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      await setDoc(ref, {
        totalSales: 1,
        totalEarnings: price,
        totalProjects: 1,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(ref, {
        totalSales: increment(1),
        totalEarnings: increment(price),
        totalProjects: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, STATS_DOC_PATH);
  }
}

export async function incrementProjectCounter() {
  try {
    const ref = doc(db, STATS_DOC_PATH);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        totalProjects: increment(1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
     handleFirestoreError(error, OperationType.UPDATE, STATS_DOC_PATH);
  }
}
