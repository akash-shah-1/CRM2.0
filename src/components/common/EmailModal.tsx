import { useState } from 'react';
import { Send, X, Paperclip, Mail, Shield, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/FormElements';
import { useAuth } from '../../store/AuthContext';
import { logCommunication } from '../../services/communicationService';
import { createNotification } from '../../utils/notifications';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  recipientName?: string;
  projectId?: string;
  type?: 'client' | 'team';
}

export function EmailModal({ isOpen, onClose, recipientEmail = '', recipientName = '', projectId, type = 'team' }: EmailModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    to: recipientEmail,
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    setIsSending(true);
    try {
      // Record the communication in Firestore via Service
      await logCommunication({
        fromId: user?.uid || 'unknown',
        fromName: user?.displayName || 'Unknown User',
        fromEmail: user?.email || '',
        toEmail: formData.to,
        subject: formData.subject,
        message: formData.message,
        status: 'sent',
        type: type
      });

      // Also create a notification for the context of activity tracking
      await createNotification({
        title: 'Email Sent',
        message: `An email was sent to ${recipientName || formData.to}: ${formData.subject}`,
        type: 'info',
        userId: user?.uid
      });

      onClose();
      // Optionally reset form
      setFormData({ to: recipientEmail, subject: '', message: '', priority: 'normal' });
    } catch (err) {
      console.error('Error sending email:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose Message"
      size="xl"
      footer={
        <div className="flex items-center justify-end w-full gap-3">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-all">Discard</button>
          <button 
            onClick={handleSubmit} 
            className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 active:scale-95"
            disabled={isSending || !formData.to || !formData.subject || !formData.message}
          >
            {isSending ? 'Sending...' : 'Send Message'}
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sending as</p>
              <p className="text-sm font-bold text-slate-900">{user?.displayName} <span className="font-medium text-slate-400 ml-1">&lt;{user?.email}&gt;</span></p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 space-y-4">
              <Input 
                label="To"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                placeholder="recipient@email.com"
                required
              />
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
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
          <p className="text-[10px] text-slate-400 italic">This message will be logged in the project communication history.</p>
        </div>
      </form>
    </Modal>
  );
}
