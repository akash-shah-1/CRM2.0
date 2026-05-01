import { useState, useEffect } from 'react';
import { Send, X, Paperclip, Mail, Shield, User, Search, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/FormElements';
import { useAuth } from '../../store/AuthContext';
import { sendInternalEmail } from '../../services/communicationService';
import { createNotification } from '../../utils/notifications';
import { getAllUsers } from '../../services/userService';
import { UserProfile } from '../../types/auth';
import { cn } from '../../utils/cn';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  recipientName?: string;
  recipientId?: string;
  initialSubject?: string;
  initialBody?: string;
  projectId?: string;
  type?: 'client' | 'team';
  threadId?: string;
}

export function EmailModal({ 
  isOpen, 
  onClose, 
  recipientEmail = '', 
  recipientName = '', 
  recipientId = '', 
  initialSubject = '',
  initialBody = '',
  projectId, 
  type = 'team',
  threadId
}: EmailModalProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent'
  });
  const [selectedRecipients, setSelectedRecipients] = useState<{ uid: string, email: string, name: string }[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setFormData(prev => ({
        ...prev,
        subject: initialSubject || prev.subject,
        message: initialBody || prev.message
      }));

      if (recipientEmail && recipientId) {
        setSelectedRecipients([{ uid: recipientId, email: recipientEmail, name: recipientName || recipientEmail }]);
      } else if (recipientEmail) {
        // If we only have email but no ID, we'll try to find the user after loading
      }
    }
  }, [isOpen, recipientEmail, recipientId, initialSubject, initialBody]);

  useEffect(() => {
    if (recipientEmail && !recipientId && users.length > 0) {
      const found = users.find(u => u.email === recipientEmail);
      if (found && !selectedRecipients.find(r => r.uid === found.uid)) {
        setSelectedRecipients([{ uid: found.uid, email: found.email, name: found.displayName || found.email }]);
      }
    }
  }, [users]);

  const loadUsers = async () => {
    try {
      const data = await getAllUsers();
      setUsers(data.filter(u => u.uid !== currentUser?.uid));
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleToggleRecipient = (user: UserProfile) => {
    const isSelected = selectedRecipients.find(r => r.uid === user.uid);
    if (isSelected) {
      setSelectedRecipients(selectedRecipients.filter(r => r.uid !== user.uid));
    } else {
      setSelectedRecipients([...selectedRecipients, { uid: user.uid, email: user.email, name: user.displayName || user.email }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || selectedRecipients.length === 0) return;

    setIsSending(true);
    try {
      // 1. Send Internal Email
      await sendInternalEmail({
        senderId: currentUser?.uid || 'unknown',
        senderName: currentUser?.displayName || 'Unknown User',
        senderEmail: currentUser?.email || '',
        recipientIds: selectedRecipients.map(r => r.uid),
        recipientEmails: selectedRecipients.map(r => r.email),
        subject: formData.subject,
        body: formData.message,
        priority: formData.priority,
        threadId: threadId
      });

      onClose();
      setFormData({ subject: '', message: '', priority: 'normal' });
      setSelectedRecipients([]);
    } catch (err) {
      console.error('Error sending email:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Internal Message"
      size="xl"
      footer={
        <div className="flex items-center justify-end w-full gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-all">Discard</button>
          <button 
            onClick={handleSubmit} 
            className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 active:scale-95"
            disabled={isSending || selectedRecipients.length === 0 || !formData.subject || !formData.message}
          >
            {isSending ? 'Sending...' : 'Send Internal Email'}
            <Send size={14} />
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4">
           <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
              {type === 'team' ? <Shield size={20} /> : <User size={20} />}
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Delivery From</p>
              <p className="text-sm font-bold text-slate-900">{currentUser?.displayName} <span className="font-medium text-slate-400 ml-1">&lt;{currentUser?.email}&gt;</span></p>
           </div>
        </div>

        <div className="space-y-2 relative">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recipients</label>
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[45px]">
            {selectedRecipients.map(r => (
              <span key={r.uid} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-200">
                {r.name}
                <button type="button" onClick={() => handleToggleRecipient(users.find(u => u.uid === r.uid)!)} className="hover:text-blue-900">
                  <X size={12} />
                </button>
              </span>
            ))}
            <input 
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-sm min-w-[150px]"
              placeholder={selectedRecipients.length === 0 ? "Search teammates..." : ""}
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
            />
          </div>
          
          {showUserDropdown && userSearch && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => {
                      handleToggleRecipient(u);
                      setUserSearch('');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">{u.displayName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                    {selectedRecipients.find(r => r.uid === u.uid) && <Check size={16} className="text-blue-600" />}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-400 italic text-center">No matching teammates found</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="md:col-span-3">
              <Input 
                label="Subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="What is this about?"
                required
              />
           </div>
           <div>
              <Select 
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                options={[
                  { label: 'Normal', value: 'normal' },
                  { label: 'High Priority', value: 'high' },
                  { label: 'Urgent', value: 'urgent' },
                ]}
              />
           </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message Content</label>
          <textarea 
            className="w-full min-h-[140px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all outline-none resize-none leading-relaxed"
            placeholder="Type your message here..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
          />
          <p className="text-[10px] text-slate-400 italic">This message will be sent internally and appear in recipients' inbox.</p>
        </div>
      </form>
    </Modal>
  );
}
