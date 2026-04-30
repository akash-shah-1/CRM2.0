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
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
            {log.toName?.charAt(0) || log.toEmail?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs">{log.toName || 'Unknown'}</div>
            <div className="text-[10px] text-slate-400">{log.toEmail}</div>
          </div>
        </div>
      )
    },
    {
      header: 'From',
      key: 'fromName',
      render: (log: any) => (
        <div className="text-xs font-medium text-slate-600">
          {log.fromName}
        </div>
      )
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (log: any) => (
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-xs text-slate-700 font-medium truncate">{log.subject}</span>
          {log.priority === 'high' && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-black uppercase">High</span>}
          {log.priority === 'urgent' && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[8px] font-black uppercase tracking-tighter">Urgent</span>}
        </div>
      )
    },
    {
      header: 'Time',
      key: 'timestamp',
      render: (log: any) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={12} />
          <span className="text-[10px] font-bold">
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
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent"
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
        <div className="text-left">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Correspondence Hub</h2>
          <p className="text-slate-500 text-sm">Review audit trails for all outbound communications.</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsComposeOpen(true)}
             className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
           >
             <Plus size={18} />
             Compose Message
           </button>
           <div className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-xs font-bold flex items-center gap-2">
              <Mail size={14} />
              {logs.length} Total Logs
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by email or subject..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-widest">
              <Filter size={14} />
              Advanced Filter
            </button>
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredLogs}
        />
        
        {!loading && filteredLogs.length === 0 && (
          <div className="py-20 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Mail size={32} className="text-slate-300" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No logs identified</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Communications sent to team members or clients will appear here.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Message Details"
        size="lg"
        footer={
          <button 
            onClick={() => setIsDetailOpen(false)}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg uppercase tracking-widest transition-all"
          >
            Close Viewer
          </button>
        }
      >
        {selectedLog && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To</div>
                <div className="text-sm font-bold text-slate-900">{selectedLog.toName}</div>
                <div className="text-xs text-slate-500">{selectedLog.toEmail}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From</div>
                <div className="text-sm font-bold text-slate-900">{selectedLog.fromName}</div>
                <div className="text-xs text-slate-500">{user?.email}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                  <Clock size={12} />
                  {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : 'Recent'}
                </div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 text-sm">
                {selectedLog.subject}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Payload</div>
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium h-[240px] overflow-y-auto custom-scrollbar">
                {selectedLog.message}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                  <UserCheck size={18} />
               </div>
               <div>
                  <div className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">Delivery Status</div>
                  <div className="text-xs font-bold text-emerald-600">Successfully processed and archived</div>
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
