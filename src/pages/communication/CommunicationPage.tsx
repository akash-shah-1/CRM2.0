import { useState, useEffect } from 'react';
import { Mail, Search, Filter, Calendar, User, ArrowUpRight, Clock, Eye, X, Send, UserCheck, Shield, Plus } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { cn } from '../../utils/cn';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/ui/Modal';
import { EmailModal } from '../../components/common/EmailModal';
import { subscribeToCommunicationLogs, CommunicationLog } from '../../services/communicationService';
import { PageTransition } from '../../components/common/PageTransition';

export default function CommunicationPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<CommunicationLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToCommunicationLogs(isAdmin, user.uid, (data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user, isAdmin]);

  const filteredLogs = logs.filter(log => 
    log.toEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.fromName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetail = (log: any) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const columns = [
    {
      header: 'Recipient',
      key: 'toName',
      render: (log: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-bg-light flex items-center justify-center text-[11px] font-bold text-text-secondary border border-border">
            {log.toName?.charAt(0) || log.toEmail?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-text-primary text-[13.5px]">{log.toName || 'Unknown'}</div>
            <div className="text-[11px] text-text-secondary">{log.toEmail}</div>
          </div>
        </div>
      )
    },
    {
      header: 'From',
      key: 'fromName',
      render: (log: any) => (
        <div className="text-[13px] font-medium text-text-primary">
          {log.fromName}
        </div>
      )
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (log: any) => (
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-[13px] text-text-secondary font-medium truncate">{log.subject}</span>
          {log.priority === 'high' && (
            <span className="px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20 rounded text-[9px] font-bold uppercase tracking-wider">High</span>
          )}
          {log.priority === 'urgent' && (
            <span className="px-1.5 py-0.5 bg-danger/10 text-danger border border-danger/20 rounded text-[9px] font-bold uppercase tracking-wider">Urgent</span>
          )}
        </div>
      )
    },
    {
      header: 'Time',
      key: 'timestamp',
      render: (log: any) => (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <Clock size={12} className="opacity-50" />
          <span className="text-[11px] font-medium">
            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'Just now'}
          </span>
        </div>
      )
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (log: any) => (
        <button 
          onClick={() => handleViewDetail(log)}
          className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-all"
        >
          <Eye size={16} />
        </button>
      )
    }
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Correspondence Hub</h2>
            <p className="text-text-secondary text-[13px]">Review audit trails for all outbound communications.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsComposeOpen(true)}
               className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
             >
               <Plus size={16} />
               Compose Message
             </button>
             <div className="px-3 py-1.5 bg-bg-light border border-border rounded text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                {logs.length} Total Logs
             </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Filter logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <button className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-text-secondary bg-white border border-border rounded hover:bg-bg-light transition-all">
              <Filter size={14} />
              Advanced
            </button>
          </div>

          <DataTable 
            columns={columns}
            data={filteredLogs}
            showCheckboxes={true}
          />
          
          {!loading && filteredLogs.length === 0 && (
            <div className="py-20 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded bg-bg-light flex items-center justify-center mx-auto mb-4 border border-border">
                <Mail size={32} className="text-text-secondary/30" />
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">No logs identified</h3>
              <p className="text-[13px] text-text-secondary mt-1 max-w-[250px] mx-auto">Communications sent to team members or clients will appear here.</p>
            </div>
          )}
        </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Message Audit Trail"
        size="lg"
        footer={
          <div className="flex justify-end w-full">
            <button 
              onClick={() => setIsDetailOpen(false)}
              className="px-6 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded shadow-sm shadow-primary/20 transition-all active:scale-95"
            >
              Close Viewer
            </button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-light/50 rounded border border-border">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Recipient</div>
                <div className="text-[14px] font-bold text-text-primary">{selectedLog.toName}</div>
                <div className="text-[12px] text-text-secondary">{selectedLog.toEmail}</div>
              </div>
              <div className="p-4 bg-bg-light/50 rounded border border-border">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Sender</div>
                <div className="text-[14px] font-bold text-text-primary">{selectedLog.fromName}</div>
                <div className="text-[12px] text-text-secondary">{user?.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Subject Information</div>
                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-bold">
                  <Clock size={12} />
                  {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : 'Recent'}
                </div>
              </div>
              <div className="p-3 bg-white border border-border rounded font-bold text-text-primary text-[13.5px]">
                {selectedLog.subject}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Message Payload</div>
              <div className="p-5 bg-bg-light/30 border border-border rounded text-[13.5px] text-text-primary leading-relaxed whitespace-pre-wrap font-medium h-[240px] overflow-y-auto custom-scrollbar">
                {selectedLog.message}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded">
               <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-success shadow-sm">
                  <UserCheck size={18} />
               </div>
               <div>
                  <div className="text-[10px] font-bold text-success uppercase tracking-wider">Delivery Status</div>
                  <div className="text-[12px] font-bold text-success">Successfully processed and archived</div>
               </div>
            </div>
          </div>
        )}
      </Modal>

      <EmailModal 
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        type="team"
      />
      </div>
    </PageTransition>
  );
}
