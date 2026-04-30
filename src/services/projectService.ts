import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface ProjectData {
  id?: string;
  name: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  clientId: string;
  clientName?: string;
  description?: string;
  createdAt: any;
}

export function subscribeToProjects(isAdmin: boolean, projectAccess: string[], callback: (projects: ProjectData[]) => void) {
  let q;
  if (isAdmin) {
    q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  } else {
    if (!projectAccess || projectAccess.length === 0) {
      callback([]);
      return () => {};
    }
    q = query(
      collection(db, 'projects'), 
      where('__name__', 'in', projectAccess),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, (snap) => {
    const projects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectData));
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'projects');
  });
}

export async function createProject(data: Omit<ProjectData, 'id' | 'createdAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'projects'), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'projects');
  }
}

export async function updateProject(id: string, data: Partial<ProjectData>) {
  try {
    const ref = doc(db, 'projects', id);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
  }
}
