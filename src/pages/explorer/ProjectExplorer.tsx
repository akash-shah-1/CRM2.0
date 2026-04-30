import { useState } from 'react';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { NOTES_DATA, DOCUMENTS_DATA, VAULT_DATA } from '../../dummy-data/tools';
import { Folder, ChevronRight, ChevronDown, FileText, FolderOpen, Lock, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../store/AuthContext';
import NotesPage from '../notes/NotesPage';
import DocumentsPage from '../documents/DocumentsPage';
import VaultPage from '../vault/VaultPage';

type ViewMode = 'explorer' | 'notes' | 'documents' | 'vault';

export default function ProjectExplorer() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('explorer');
  const [searchTerm, setSearchTerm] = useState('');

  const hasPermission = (moduleId: string) => {
    return user?.role === 'admin' || user?.permissions?.includes(moduleId);
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProjects = PROJECTS_DATA.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.client.toLowerCase().includes(searchTerm.toLowerCase());
    if (user?.role === 'admin') return matchesSearch;
    return matchesSearch && user?.projectAccess?.includes(p.id);
  });

  const selectedProject = PROJECTS_DATA.find(p => p.id === selectedProjectId);

  const categories = [
    { id: 'notes', label: 'Notes', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', count: NOTES_DATA.filter(n => n.projectId === selectedProjectId).length },
    { id: 'documents', label: 'Documents', icon: FolderOpen, color: 'text-purple-600', bg: 'bg-purple-50', count: DOCUMENTS_DATA.filter(d => d.projectId === selectedProjectId).length },
    { id: 'vault', label: 'Vault', icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50', count: VAULT_DATA.filter(v => v.projectId === selectedProjectId).length },
  ].filter(cat => hasPermission(cat.id));

  const renderContent = () => {
    if (!selectedProjectId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-text-secondary p-8 space-y-4">
           <div className="w-20 h-20 rounded-md bg-bg-light flex items-center justify-center border border-border shadow-sm">
             <FolderOpen size={40} className="opacity-20 text-slate-300" />
           </div>
           <div className="text-center">
             <h3 className="text-text-primary font-bold">No Project Selected</h3>
             <p className="text-sm text-text-secondary">Select a project from the explorer to see its assets.</p>
           </div>
        </div>
      );
    }

    if (viewMode !== 'explorer' && !hasPermission(viewMode)) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          No Permission
        </div>
      );
    }

    switch (viewMode) {
      case 'notes':
        return <NotesPage projectId={selectedProjectId} />;
      case 'documents':
        return <DocumentsPage projectId={selectedProjectId} />;
      case 'vault':
        return <VaultPage projectId={selectedProjectId} />;
      default:
        return (
          <div className="p-8 max-w-4xl">
            <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">{selectedProject?.title}</h2>
            <p className="text-text-secondary mb-8">Select a category below to explore project-specific assets.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setViewMode(cat.id as ViewMode)}
                  className="bg-white p-6 rounded-md border border-border shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className={cn("w-12 h-12 rounded-md flex items-center justify-center mb-4 transition-transform group-hover:scale-110", 
                    cat.id === 'notes' ? "bg-primary/10 text-primary" : 
                    cat.id === 'documents' ? "bg-secondary/10 text-secondary" : 
                    "bg-warning/10 text-warning"
                  )}>
                    <cat.icon size={24} />
                  </div>
                  <div className="font-bold text-text-primary text-lg tracking-tight">{cat.label}</div>
                  <div className="text-[11px] text-text-secondary font-bold uppercase tracking-widest mt-1">{cat.count} Items</div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-border rounded-md overflow-hidden shadow-sm">
      {/* Sidebar Explorer */}
      <div className="w-72 border-r border-border flex flex-col bg-bg-light/30">
        <div className="p-4 border-b border-border bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary shadow-sm outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {filteredProjects.map((project) => (
            <div key={project.id} className="mb-1">
              <button
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setViewMode('explorer');
                }}
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md text-sm font-semibold transition-colors",
                  selectedProjectId === project.id ? "bg-primary text-white shadow-sm" : "text-text-secondary hover:bg-white hover:text-text-primary"
                )}
              >
                <Folder size={16} className={cn("shrink-0", selectedProjectId === project.id ? "text-white" : "text-text-secondary/60")} />
                <span className="truncate">{project.title}</span>
                <ChevronRight size={14} className={cn("ml-auto transition-transform", selectedProjectId === project.id && "rotate-90")} />
              </button>
              
              {selectedProjectId === project.id && (
                <div className="ml-6 mt-1 space-y-1">
                  {[
                    { id: 'notes', label: 'Notes', icon: FileText },
                    { id: 'documents', label: 'Documents', icon: FolderOpen },
                    { id: 'vault', label: 'Vault', icon: Lock },
                  ].filter(sub => hasPermission(sub.id)).map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setViewMode(sub.id as ViewMode);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 p-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-colors",
                        viewMode === sub.id ? "text-primary bg-primary/10" : "text-text-secondary/60 hover:text-text-primary"
                      )}
                    >
                      <sub.icon size={12} />
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col">
        {selectedProjectId && viewMode !== 'explorer' && (
          <div className="px-8 py-3 border-b border-border flex items-center justify-between bg-bg-light/30">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
               <Folder size={12} />
               <span>{selectedProject?.title}</span>
               <ChevronRight size={10} />
               <span className="text-primary">{viewMode}</span>
            </div>
            <button 
              onClick={() => setViewMode('explorer')}
              className="text-[10px] font-bold text-text-secondary hover:text-primary uppercase tracking-widest transition-colors"
            >
              Back to Overview
            </button>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}
