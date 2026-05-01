import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../types/auth';
import { Users, Briefcase, Calendar, TrendingUp, DollarSign, Wallet } from 'lucide-react';
import { GlobalStats } from '../services/statsService';

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
    { id: '1', label: 'Earning', value: '...', trend: '12%', status: 'up', icon: Wallet },
    { id: '2', label: 'Sales', value: '...', trend: '5%', status: 'up', icon: DollarSign },
    { id: '3', label: 'Active Projects', value: '...', trend: '', status: 'neutral', icon: Briefcase },
    { id: '4', label: 'Completed', value: '...', trend: '', status: 'neutral', icon: TrendingUp },
  ]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;

    // 1. Global Earnings & Sales (Admin Only or simplified for others)
    const unsubStats = onSnapshot(doc(db, 'system_stats', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as GlobalStats;
        setStats(prev => prev.map(s => {
          if (s.id === '1') return { ...s, value: `$${(data.totalEarnings || 0).toLocaleString()}` };
          if (s.id === '2') return { ...s, value: (data.totalSales || 0).toString() };
          return s;
        }));
      } else {
        setStats(prev => prev.map(s => {
          if (s.id === '1' || s.id === '2') return { ...s, value: '$0' };
          return s;
        }));
      }
    });

    // 2. Projects count
    const projectsQuery = isAdmin 
      ? query(collection(db, 'projects'))
      : query(collection(db, 'projects'), where('__name__', 'in', user.projectAccess && user.projectAccess.length > 0 ? user.projectAccess : ['none']));

    const unsubProjects = onSnapshot(projectsQuery, (snap) => {
      const active = snap.docs.filter(d => d.data().status === 'active' || d.data().status === 'lead').length;
      const completed = snap.docs.filter(d => d.data().status === 'completed').length;
      setStats(prev => prev.map(s => {
        if (s.id === '3') return { ...s, value: active.toString() };
        if (s.id === '4') return { ...s, value: completed.toString() };
        return s;
      }));
    });

    return () => {
      unsubStats();
      unsubProjects();
    };
  }, [user, isAdmin]);

  return stats;
}
