import { useState, useEffect } from 'react';
import { Bell, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../store/AuthContext';
import { requestNotificationPermission, onMessageListener } from '../../services/messagingService';

export function NotificationBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    if (user && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShow(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const unsub = onMessageListener((payload) => {
        setToast({
          title: payload.notification?.title || 'New Message',
          body: payload.notification?.body || ''
        });
        
        // Auto hide toast after 5 seconds
        setTimeout(() => setToast(null), 5000);
      });
      return () => {
        if (unsub) unsub();
      };
    }
  }, [user]);

  const handleEnable = async () => {
    if (user) {
      await requestNotificationPermission(user);
      setShow(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Bell className="text-blue-400" size={20} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bold tracking-tight">Enable Notifications</h4>
                <p className="text-[11px] text-slate-400">Get real-time alerts for team messages and project updates.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShow(false)}
                  className="p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <button
                  onClick={handleEnable}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  Enable
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-20 right-6 z-[60] w-full max-w-xs"
          >
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xl flex items-start gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="bg-blue-50 p-2 rounded-lg mt-0.5">
                <MessageSquare className="text-blue-600" size={18} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bold text-slate-900">{toast.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{toast.body}</p>
              </div>
              <button 
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
