import { useState, useEffect } from 'react';
import { Mail, Search, Filter, Calendar, User, ArrowUpRight, Clock, Eye, X, Send, UserCheck, Shield, Plus, Inbox, Send as SendIcon, FileText, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { cn } from '../../utils/cn';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/ui/Modal';
import { EmailModal } from '../../components/common/EmailModal';
import { subscribeToInbox, subscribeToSentEmails, InternalEmail, markEmailAsRead, deleteInternalEmails } from '../../services/communicationService';
import { PageTransition } from '../../components/common/PageTransition';

type ViewType = 'inbox' | 'sent';

export default function CommunicationPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeView, setActiveView] = useState<ViewType>('inbox');
  const [inbox, setInbox] = useState<InternalEmail[]>([]);
  const [sent, setSent] = useState<InternalEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<InternalEmail | null>(null);
  const [isEmailDetailOpen, setIsEmailDetailOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyData, setReplyData] = useState<{
    email: string;
    name: string;
    id: string;
    subject: string;
    body: string;
    threadId: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);

    const unsubInbox = subscribeToInbox(user.uid, (data) => {
      // Group by threadId for the list view, but keep all emails for the detail view
      setInbox(data);
      setLoading(false);
    });

    const unsubSent = subscribeToSentEmails(user.uid, (data) => {
      setSent(data);
    });

    return () => {
      unsubInbox();
      unsubSent();
    };
  }, [user, isAdmin]);

  const handleReply = (email: InternalEmail) => {
    setReplyData({
      email: email.senderEmail,
      name: email.senderName,
      id: email.senderId,
      subject: email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`,
      body: `\n\n--- Original Message ---\nFrom: ${email.senderName}\nSubject: ${email.subject}\n\n${email.body}`,
      threadId: email.threadId || email.id!
    });
    setIsComposeOpen(true);
  };

  const filteredData = () => {
    const list = activeView === 'inbox' ? inbox : sent;
    const emailList = list as InternalEmail[];
    const threads: Record<string, InternalEmail> = {};
    
    emailList.forEach(email => {
      const tid = email.threadId || email.id!;
      if (!threads[tid] || (email.timestamp?.toMillis ? email.timestamp.toMillis() : 0) > (threads[tid].timestamp?.toMillis ? threads[tid].timestamp.toMillis() : 0)) {
        threads[tid] = email;
      }
    });
    
    const uniqueThreads = Object.values(threads);
    return uniqueThreads
      .filter((item: any) => 
        (item.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.senderName || item.fromName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.recipientEmails?.join(', ') || item.toEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0) - (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0));
  };

  const handleViewEmail = (email: InternalEmail) => {
    setSelectedEmail(email);
    setIsEmailDetailOpen(true);
    if (activeView === 'inbox' && !email.readBy.includes(user?.uid || '')) {
      markEmailAsRead(email.id!, user?.uid || '');
    }
  };

  const handleDeleteEmails = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} thread(s)?`)) return;
    
    setIsDeleting(true);
    try {
      // Find all thread IDs for the selected messages
      const currentData = filteredData();
      const selectedThreads = currentData.filter(d => selectedIds.includes(d.id!));
      const threadIdsToDelete = selectedThreads.map(d => d.threadId || d.id!);
      
      // Find all email IDs in those threads
      const emailIdsToDelete = [...inbox, ...sent]
        .filter(e => threadIdsToDelete.includes(e.threadId || e.id!))
        .map(e => e.id!);
      
      await deleteInternalEmails(emailIdsToDelete);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting emails:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const emailColumns = [
    {
      header: activeView === 'inbox' ? 'Sender' : 'Recipients',
      key: activeView === 'inbox' ? 'senderName' : 'recipientEmails',
      render: (email: InternalEmail) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded flex items-center justify-center text-[11px] font-bold border",
            activeView === 'inbox' && !email.readBy.includes(user?.uid || '') ? "bg-primary text-white border-primary" : "bg-bg-light text-text-secondary border-border"
          )}>
            {(activeView === 'inbox' ? email.senderName : email.recipientEmails[0])?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <div className={cn(
              "text-[13.5px] truncate",
              activeView === 'inbox' && !email.readBy.includes(user?.uid || '') ? "font-bold text-text-primary" : "font-semibold text-text-primary/70"
            )}>
              {activeView === 'inbox' ? email.senderName : email.recipientEmails.join(', ')}
            </div>
            <div className="text-[11px] text-text-secondary truncate">
              {activeView === 'inbox' ? email.senderEmail : `${email.recipientIds.length} recipient(s)`}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (email: InternalEmail) => (
        <div className="flex items-center gap-2 max-w-sm">
          <span className={cn(
            "text-[13px] truncate",
            activeView === 'inbox' && !email.readBy.includes(user?.uid || '') ? "font-bold text-text-primary" : "text-text-secondary"
          )}>
            {email.subject}
          </span>
          {email.priority !== 'normal' && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
              email.priority === 'urgent' ? "bg-danger/10 text-danger border-danger/20" : "bg-warning/10 text-warning border-warning/20"
            )}>
              {email.priority}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Date',
      key: 'timestamp',
      render: (email: InternalEmail) => (
        <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
          {email.timestamp?.toDate ? email.timestamp.toDate().toLocaleDateString() : 'Today'}
        </span>
      )
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (email: InternalEmail) => (
        <button 
          onClick={() => handleViewEmail(email)}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-all"
        >
          <Eye size={16} />
        </button>
      )
    }
  ];

  const unreadCount = inbox.filter(e => !e.readBy.includes(user?.uid || '')).length;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Organization Mailbox</h2>
            <p className="text-text-secondary text-[13px]">Send and receive internal messages securely within the ERP.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsComposeOpen(true)}
               className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
             >
               <Plus size={16} />
               Compose Mail
             </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Internal Sidebar */}
          <div className="w-full lg:w-60 shrink-0 space-y-1">
            <button 
              onClick={() => setActiveView('inbox')}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all",
                activeView === 'inbox' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:bg-white border border-transparent hover:border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <Inbox size={18} />
                <span>Inbox</span>
              </div>
              {unreadCount > 0 && <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", activeView === 'inbox' ? "bg-white text-primary" : "bg-primary text-white")}>{unreadCount}</span>}
            </button>
            <button 
              onClick={() => setActiveView('sent')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all",
                activeView === 'sent' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:bg-white border border-transparent hover:border-border"
              )}
            >
              <SendIcon size={18} />
              <span>Sent Messages</span>
            </button>
          </div>

          {/* Table Area */}
          <div className="flex-1 bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeView}...`} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <button 
                    onClick={handleDeleteEmails}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-3 py-2 bg-danger/10 text-danger border border-danger/20 rounded-lg text-[13px] font-bold hover:bg-danger/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
                  </button>
                )}
                <button className="p-2 text-text-secondary hover:bg-bg-light rounded-lg border border-border">
                  <Filter size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1">
              <DataTable<InternalEmail & { id: string }> 
                columns={emailColumns as any}
                data={filteredData() as (InternalEmail & { id: string })[]}
                showCheckboxes={true}
                selectedRows={selectedIds}
                onToggleRow={(id) => {
                  setSelectedIds(prev => 
                    prev.includes(id as string) 
                      ? prev.filter(i => i !== id) 
                      : [...prev, id as string]
                  );
                }}
                onToggleAll={() => {
                  const data = filteredData();
                  if (selectedIds.length === data.length) {
                    setSelectedIds([]);
                  } else {
                    setSelectedIds(data.map(d => d.id!));
                  }
                }}
              />
              
              {!loading && filteredData().length === 0 && (
                <div className="py-24 text-center animate-in fade-in duration-500">
                  <div className="w-16 h-16 rounded-full bg-bg-light flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
                    <Mail size={24} className="text-text-secondary/30" />
                  </div>
                  <h3 className="text-[15px] font-bold text-text-primary">No correspondence found</h3>
                  <p className="text-[13px] text-text-secondary mt-1 max-w-[250px] mx-auto">Messages related to your account or projects will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Email Detail Modal */}

        <Modal
          isOpen={isEmailDetailOpen}
          onClose={() => setIsEmailDetailOpen(false)}
          title={selectedEmail?.subject || 'Message'}
          size="lg"
          footer={
            <div className="flex justify-between items-center w-full">
              <button 
                onClick={() => selectedEmail && handleReply(selectedEmail)}
                className="px-4 py-2 text-[13px] font-bold text-primary hover:bg-primary/5 rounded border border-primary/20 transition-all flex items-center gap-2"
              >
                <Plus size={16} />
                Reply to Message
              </button>
              <button onClick={() => setIsEmailDetailOpen(false)} className="px-6 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded shadow-sm shadow-primary/20 transition-all">Done Reading</button>
            </div>
          }
        >
          {selectedEmail && (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Show all emails in thread - ensure unique IDs to avoid React key errors */}
              {Array.from(new Map([...inbox, ...sent].map(e => [e.id, e])).values())
                .filter(e => (e.threadId || e.id) === (selectedEmail.threadId || selectedEmail.id))
                .sort((a, b) => (a.timestamp?.toMillis ? a.timestamp.toMillis() : 0) - (b.timestamp?.toMillis ? b.timestamp.toMillis() : 0))
                .map((email, idx) => (
                  <div key={email.id} className={cn(
                    "space-y-4 p-4 rounded-xl border",
                    idx === 0 ? "bg-bg-light/40 border-primary/20 shadow-sm" : "bg-bg-light/10 border-border opacity-80"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20 text-sm">
                          {email.senderName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text-primary">{email.senderName}</div>
                          <div className="text-[11px] text-text-secondary">{email.senderEmail}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">
                          {email.senderId === user?.uid ? 'Sent' : 'Received'}
                        </div>
                        <div className="text-[12px] font-bold text-text-primary">
                          {email.timestamp?.toDate ? email.timestamp.toDate().toLocaleString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="text-[11px] font-bold text-text-secondary">To: <span className="text-text-primary font-bold ml-1">{email.recipientEmails.join(', ')}</span></div>
                        {email.priority !== 'normal' && (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                            email.priority === 'urgent' ? "bg-danger text-white" : "bg-warning text-white"
                          )}>{email.priority}</span>
                        )}
                      </div>
                      <div className="text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap font-medium">
                        {email.body}
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </Modal>

        <EmailModal 
          isOpen={isComposeOpen}
          onClose={() => {
            setIsComposeOpen(false);
            setReplyData(null);
          }}
          recipientEmail={replyData?.email}
          recipientName={replyData?.name}
          recipientId={replyData?.id}
          initialSubject={replyData?.subject}
          initialBody={replyData?.body}
          threadId={replyData?.threadId}
          type="team"
        />
      </div>
    </PageTransition>
  );
}
