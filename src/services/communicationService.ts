import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  where,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from '../utils/firebaseErrorHandler';
import { createNotification } from '../utils/notifications';

export interface InternalEmail {
  id?: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientIds: string[];
  recipientEmails: string[];
  subject: string;
  body: string;
  priority: 'normal' | 'high' | 'urgent';
  timestamp: any;
  readBy: string[];
  threadId?: string;
  replyToId?: string;
}

export function subscribeToInbox(userId: string, callback: (emails: InternalEmail[]) => void) {
  const q = query(
    collection(db, 'internal_emails'),
    where('recipientIds', 'array-contains', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const emails = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalEmail));
    callback(emails);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'internal_emails');
  });
}

export function subscribeToSentEmails(userId: string, callback: (emails: InternalEmail[]) => void) {
  const q = query(
    collection(db, 'internal_emails'),
    where('senderId', '==', userId),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snap) => {
    const emails = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InternalEmail));
    callback(emails);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'internal_emails');
  });
}

export async function sendInternalEmail(data: Omit<InternalEmail, 'id' | 'timestamp' | 'readBy'>) {
  try {
    const emailData: any = {
      ...data,
      timestamp: serverTimestamp(),
      readBy: []
    };

    const docRef = await addDoc(collection(db, 'internal_emails'), emailData);
    
    // If no threadId was provided, it's a new thread. Set threadId to its own ID.
    if (!data.threadId) {
      await updateDoc(doc(db, 'internal_emails', docRef.id), {
        threadId: docRef.id
      });
    }

    // Create notifications for each recipient
    const notificationPromises = data.recipientIds.map(recipientId => 
      createNotification({
        title: 'New Internal Email',
        message: `You received an email from ${data.senderName}: ${data.subject}`,
        type: 'info',
        userId: recipientId
      })
    );
    
    await Promise.all(notificationPromises);
    
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'internal_emails');
  }
}

export async function markEmailAsRead(emailId: string, userId: string) {
  try {
    const emailRef = doc(db, 'internal_emails', emailId);
    await updateDoc(emailRef, {
      readBy: arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'internal_emails');
  }
}

export async function deleteInternalEmails(emailIds: string[]) {
  try {
    const batch = writeBatch(db);
    emailIds.forEach(id => {
      const docRef = doc(db, 'internal_emails', id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'internal_emails');
  }
}
