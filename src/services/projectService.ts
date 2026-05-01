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
  where,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';

export interface ProjectData {
  id?: string;
  clientId: string;
  clientName?: string;
  title: string;
  description?: string;
  requirements?: string;
  promisedFeatures?: string[];
  outOfScope?: string[];
  price: number;
  status: 'lead' | 'active' | 'completed' | 'on_hold';
  startDate?: any;
  endDate?: any;
  completionDate?: any;
  techStack?: string[];
  maintenanceYears?: number;
  liveLink?: string;
  stagingLink?: string;
  repoLink?: string;
  credentials?: string;
  meetingNotes?: Array<{ date: number; summary: string }>;
  teamIds?: string[];
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

import { updateStatsOnProjectCompletion } from './statsService';

export async function updateProject(id: string, data: Partial<ProjectData>) {
  try {
    const ref = doc(db, 'projects', id);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function completeProject(projectId: string, clientId: string, price: number) {
  try {
    // 1. Update Project Status
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      status: 'completed',
      completionDate: serverTimestamp()
    });

    // 2. Update Client Stats
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, {
      totalProjects: increment(1),
      totalSpent: increment(price),
      updatedAt: serverTimestamp()
    });

    // 3. Update Global Stats
    await updateStatsOnProjectCompletion(price);
    
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${projectId}`);
  }
}
