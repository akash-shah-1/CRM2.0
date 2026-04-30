import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface ClientData {
  id?: string;
  name: string;
  email: string;
  company: string;
  status: 'active' | 'inactive' | 'lead';
  phone?: string;
  createdAt: any;
}

export function subscribeToClients(callback: (clients: ClientData[]) => void) {
  const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const clients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientData));
    callback(clients);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'clients');
  });
}

export async function createClient(data: Omit<ClientData, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'clients'), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'clients');
  }
}

export async function updateClient(id: string, data: Partial<ClientData>) {
  try {
    const ref = doc(db, 'clients', id);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
  }
}
