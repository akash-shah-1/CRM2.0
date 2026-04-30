import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, X, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cn } from '../../utils/cn';
import { useAuth } from '../../store/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: any;
  read: boolean;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    // In a real app, this would be a 'notifications' collection
    // For this prototype, we'll use a mocked listener or listen to 'activity' if available
    // But let's assume a notifications collection for best practice
    let q;
    if (user?.role === 'admin') {
      q = query(
        collection(db, 'notifications'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    } else {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', user?.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      markAsRead(n.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check size={14} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg transition-colors border",
          isOpen ? "bg-slate-50 border-slate-200" : "border-transparent hover:bg-slate-50"
        )}
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest leading-none">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-[10px] font-black text-blue-600 uppercase tracking-tighter hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 hover:bg-slate-50/50 transition-colors cursor-pointer group",
                    !n.read && "bg-blue-50/30"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div className={cn(
                      "mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                      n.type === 'success' ? "bg-green-50 border-green-100" :
                      n.type === 'warning' ? "bg-amber-50 border-amber-100" :
                      n.type === 'error' ? "bg-red-50 border-red-100" :
                      "bg-blue-50 border-blue-100"
                    )}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-slate-900 text-xs truncate pr-2">{n.title}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{formatTime(n.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                  <Bell size={24} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No notifications yet</p>
                <p className="text-[10px] text-slate-300 mt-1 italic">We'll alert you when something happens.</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
            <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
              View all activities
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
