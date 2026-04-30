import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../types/auth';
import { Users, Briefcase, Calendar, TrendingUp } from 'lucide-react';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  trend: string;
  status: 'up' | 'down' | 'neutral';
  icon: any;
}

export function useDashboardStats(user: UserProfile | null) {
  const [stats, setStats] = useState<DashboardStat[]>([
    { id: '1', label: 'Total Clients', value: '...', trend: '', status: 'neutral', icon: Users },
    { id: '2', label: 'My Projects', value: '...', trend: '', status: 'neutral', icon: Briefcase },
    { id: '3', label: 'Active Documentation', value: '...', trend: '', status: 'neutral', icon: Calendar },
    { id: '4', label: 'Completed Projects', value: '...', trend: '', status: 'neutral', icon: TrendingUp },
  ]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    // 1. Clients count
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setStats(prev => prev.map(s => s.id === '1' ? { ...s, value: snap.size.toString() } : s));
    });

    // 2. Projects count
    const projectsQuery = isAdmin 
      ? query(collection(db, 'projects'))
      : query(collection(db, 'projects'), where('__name__', 'in', user.projectAccess && user.projectAccess.length > 0 ? user.projectAccess : ['none']));

    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      const total = snap.size;
      const completed = snap.docs.filter(d => d.data().status === 'completed').length;
      setStats(prev => prev.map(s => {
        if (s.id === '2') return { ...s, value: total.toString() };
        if (s.id === '4') return { ...s, value: completed.toString() };
        return s;
      }));
    });

    // 3. Documents count
    const docsQuery = isAdmin
      ? query(collection(db, 'documents'))
      : query(collection(db, 'documents'), where('projectId', 'in', user.projectAccess && user.projectAccess.length > 0 ? user.projectAccess : ['none']));

    const unsubDocs = onSnapshot(docsQuery, (snap) => {
      setStats(prev => prev.map(s => s.id === '3' ? { ...s, value: snap.size.toString() } : s));
    });

    return () => {
      unsubClients();
      unsubProjects();
      unsubDocs();
    };
  }, [user, isAdmin]);

  return stats;
}
