import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  where,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface CommunicationLog {
  id?: string;
  fromId: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  message: string;
  timestamp: any;
  status: 'sent' | 'failed' | 'scheduled';
  type?: 'client' | 'team';
  toName?: string;
}

export function subscribeToCommunicationLogs(
  isAdmin: boolean,
  userId: string,
  callback: (logs: CommunicationLog[]) => void
) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'communications'), orderBy('timestamp', 'desc'));
  } else {
    q = query(
      collection(db, 'communications'),
      where('fromId', '==', userId),
      orderBy('timestamp', 'desc')
    );
  }

  return onSnapshot(q, (snap) => {
    const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunicationLog));
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'communications');
  });
}

export async function logCommunication(data: Omit<CommunicationLog, 'id' | 'timestamp'>) {
  try {
    const docRef = await addDoc(collection(db, 'communications'), {
      ...data,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'communications');
  }
}
