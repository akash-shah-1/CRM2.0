import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../types/auth';

export function useRecentActivity(user: UserProfile | null) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin';
    let q;

    if (isAdmin) {
      q = query(
        collection(db, 'activity'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    } else {
      // For employees/managers, we fetch activities they might be related to
      // In a more complex system, we'd query by projectId
      q = query(
        collection(db, 'activity'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!isAdmin) {
        // Client-side filter for now to avoid complex composite indexes on activity collection 
        // during rapid prototyping, unless specifically mapped
        results = results.filter((a: any) => 
          !a.projectId || (user.projectAccess && user.projectAccess.includes(a.projectId)) || a.userId === user.uid
        ).slice(0, 20);
      }

      setActivities(results);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return { activities, loading };
}
