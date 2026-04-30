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
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface NoteData {
  id?: string;
  title: string;
  content: string;
  category: string;
  projectId: string;
  createdAt: any;
  updatedAt?: any;
  authorId?: string;
  authorName?: string;
}

export function subscribeToNotes(
  isAdmin: boolean, 
  projectAccess: string[], 
  callback: (notes: NoteData[]) => void
) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
  } else {
    if (!projectAccess || projectAccess.length === 0) {
      callback([]);
      return () => {};
    }
    
    q = query(
      collection(db, 'notes'), 
      where('projectId', 'in', projectAccess),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, (snap) => {
    const notes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NoteData));
    callback(notes);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notes');
  });
}

export async function createNote(data: Omit<NoteData, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'notes'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notes');
  }
}

export async function updateNote(id: string, updates: Partial<NoteData>) {
  try {
    await updateDoc(doc(db, 'notes', id), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notes/${id}`);
  }
}

export async function removeNote(id: string) {
  try {
    await deleteDoc(doc(db, 'notes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notes/${id}`);
  }
}
