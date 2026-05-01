import { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Github, 
  Globe, 
  Key, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock,
  Briefcase,
  Layers,
  ShieldCheck,
  FileText,
  Save,
  Trash2
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ProjectData, updateProject, completeProject } from '../../services/projectService';
import { logActivity } from '../../utils/activity';
import { useAuth } from '../../store/AuthContext';
import { serverTimestamp } from 'firebase/firestore';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
}

export function ProjectDetailModal({ isOpen, onClose, project }: ProjectDetailModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'mom'>('overview');
  
  // Local state for meeting notes
  const [newNote, setNewNote] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const note = {
      date: Date.now(),
      summary: newNote.trim()
    };
    const updatedNotes = [...(project.meetingNotes || []), note];
    await updateProject(project.id!, { meetingNotes: updatedNotes });
    setNewNote('');
    
    logActivity({
      userId: user?.uid || 'unknown',
      userName: user?.displayName || 'Unknown',
      action: 'added meeting summary (MOM)',
      target: project.title,
      type: 'project',
      projectId: project.id
    });
  };

  const handleComplete = async () => {
    if (project.status === 'completed') return;
    if (!confirm('Finalizing this project will update global earnings and client stats. Continue?')) return;
    
    setIsSaving(true);
    try {
      await completeProject(project.id!, project.clientId, project.price);
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'completed project',
        target: project.title,
        type: 'project',
        projectId: project.id
      });
      
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error completing project');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project.title}
      size="2xl"
      className="p-0"
    >
      <div className="flex flex-col h-[780px] bg-slate-50/30">
        {/* Header Tabs */}
        <div className="px-8 pt-6 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                project.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                project.status === 'active'    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                project.status === 'on_hold'   ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {project.status.replace('_', ' ')}
              </span>
              <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">{project.clientName}</span>
            </div>
            {isAdmin && project.status !== 'completed' && (
              <button
                onClick={handleComplete}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-[13px] font-semibold rounded-xl hover:bg-emerald-700 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Mark as Completed
              </button>
            )}
          </div>

          <div className="flex gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Briefcase },
              { id: 'technical', label: 'Links & Tech', icon: ShieldCheck },
              { id: 'mom', label: 'MOM & Meetings', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-[13px] font-semibold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-indigo-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <section>
                  <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-3">Project Requirements</h4>
                  <div className="p-4 bg-white border border-border rounded-xl text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                    {project.requirements || 'No detailed requirements specified.'}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-6">
                  <section>
                    <h4 className="text-[12px] font-bold text-success uppercase tracking-wider mb-3">Promised Features</h4>
                    <div className="space-y-2">
                      {project.promisedFeatures?.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[13px] text-text-primary px-3 py-2 bg-white border border-border rounded-lg">
                          <CheckCircle2 size={14} className="text-success" />
                          {f}
                        </div>
                      ))}
                      {(!project.promisedFeatures || project.promisedFeatures.length === 0) && <p className="text-[12px] italic text-text-secondary">None listed</p>}
                    </div>
                  </section>
                  <section>
                    <h4 className="text-[12px] font-bold text-danger uppercase tracking-wider mb-3">Out of Scope</h4>
                    <div className="space-y-2">
                      {project.outOfScope?.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[13px] text-text-primary px-3 py-2 bg-white border border-border rounded-lg">
                          <X size={14} className="text-danger" />
                          {f}
                        </div>
                      ))}
                      {(!project.outOfScope || project.outOfScope.length === 0) && <p className="text-[12px] italic text-text-secondary">None listed</p>}
                    </div>
                  </section>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-4">
                  <h4 className="text-[12px] font-bold text-primary uppercase tracking-wider">Economics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-text-secondary">Total Price:</span>
                      <span className="font-bold text-text-primary">${(project.price || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-text-secondary">Support Span:</span>
                      <span className="font-bold text-text-primary">{project.maintenanceYears || 1} Year(s) Free</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white border border-border rounded-2xl space-y-4">
                  <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Timeline</h4>
                  <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-bg-light rounded-lg text-text-secondary"><Clock size={16} /></div>
                       <div>
                         <div className="text-[11px] font-bold text-text-secondary uppercase">Started</div>
                         <div className="text-[13px] font-bold text-text-primary">{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Pending'}</div>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="p-2 bg-bg-light rounded-lg text-text-secondary"><Calendar size={16} /></div>
                       <div>
                         <div className="text-[11px] font-bold text-text-secondary uppercase">Deadline</div>
                         <div className="text-[13px] font-bold text-text-primary">{project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}</div>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <section className="space-y-4">
                 <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Deployment Links</h4>
                 <div className="space-y-3">
                   <a href={project.liveLink} target="_blank" className="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-primary transition-all group">
                     <div className="flex items-center gap-3">
                       <Globe size={20} className="text-success" />
                       <span className="text-[14px] font-bold text-text-primary">Production Live</span>
                     </div>
                     <ExternalLink size={16} className="text-text-secondary opacity-0 group-hover:opacity-100" />
                   </a>
                   <a href={project.stagingLink} target="_blank" className="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-primary transition-all group">
                     <div className="flex items-center gap-3">
                       <Layers size={20} className="text-primary" />
                       <span className="text-[14px] font-bold text-text-primary">Staging Environment</span>
                     </div>
                     <ExternalLink size={16} className="text-text-secondary opacity-0 group-hover:opacity-100" />
                   </a>
                   <a href={project.repoLink} target="_blank" className="flex items-center justify-between p-4 bg-white border border-border rounded-xl hover:border-primary transition-all group">
                     <div className="flex items-center gap-3">
                       <Github size={20} className="text-slate-900" />
                       <span className="text-[14px] font-bold text-text-primary">Source Code Repo</span>
                     </div>
                     <ExternalLink size={16} className="text-text-secondary opacity-0 group-hover:opacity-100" />
                   </a>
                 </div>
               </section>

               <section className="space-y-4">
                 <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Access Credentials</h4>
                 <div className="p-4 bg-slate-900 rounded-xl font-mono text-[13px] text-slate-300 min-h-[140px] whitespace-pre-wrap">
                   {project.credentials || 'No shared credentials documented.'}
                 </div>
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3 text-[12px] text-amber-800">
                   <ShieldCheck size={16} className="flex-shrink-0" />
                   <p>Remember to rotate credentials after project handover or staging environment teardown.</p>
                 </div>
               </section>
            </div>
          )}

          {activeTab === 'mom' && (
            <div className="max-w-3xl mx-auto space-y-8">
              <section className="p-6 bg-white border border-border rounded-2xl shadow-sm">
                 <h4 className="text-[14px] font-bold text-text-primary mb-4">Add Meeting Summary (MOM)</h4>
                 <textarea 
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Summarize the discussion, decisions, and action items..."
                  className="w-full p-4 bg-bg-light border border-border rounded-xl text-[14px] min-h-[120px] focus:outline-none focus:border-primary transition-all mb-4 outline-none"
                 />
                 <div className="flex justify-end">
                   <button 
                    onClick={handleAddNote}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-lg hover:bg-primary-hover shadow-sm transition-all active:scale-95"
                   >
                     <Save size={16} />
                     Save Meeting MOM
                   </button>
                 </div>
              </section>

              <div className="space-y-6">
                <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Minutes of Meeting History</h4>
                {project.meetingNotes?.slice().sort((a,b) => b.date - a.date).map((note, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1 w-0.5 bg-border my-1 group-last:hidden" />
                    </div>
                    <div className="flex-1 pb-8 group-last:pb-0">
                      <div className="text-[11px] font-bold text-text-secondary uppercase mb-1">
                        {new Date(note.date).toLocaleDateString()} at {new Date(note.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="p-4 bg-white border border-border rounded-xl text-[14px] text-text-primary leading-relaxed whitespace-pre-wrap">
                        {note.summary}
                      </div>
                    </div>
                  </div>
                ))}
                {(!project.meetingNotes || project.meetingNotes.length === 0) && (
                  <div className="text-center py-10 text-text-secondary italic text-[13px]">No meetings documented yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
