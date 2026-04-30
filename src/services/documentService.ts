import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  where,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface DocumentData {
  id?: string;
  name: string;
  type: string;
  size: string;
  projectId: string;
  uploadedBy: string;
  uploadedByUid?: string;
  createdAt: any;
}

export function subscribeToDocuments(
  isAdmin: boolean, 
  projectAccess: string[], 
  callback: (docs: DocumentData[]) => void
) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
  } else {
    if (!projectAccess || projectAccess.length === 0) {
      callback([]);
      return () => {};
    }
    
    q = query(
      collection(db, 'documents'), 
      where('projectId', 'in', projectAccess),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentData));
    callback(docs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'documents');
  });
}

export async function uploadDocument(data: Omit<DocumentData, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'documents'), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'documents');
  }
}

export async function removeDocument(id: string) {
  try {
    await deleteDoc(doc(db, 'documents', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `documents/${id}`);
  }
}
