import { useState, useEffect, useMemo } from 'react';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { Calendar, Users, CheckCircle2, CircleDashed, PauseCircle, Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { ActionMenu } from '../../components/common/ActionMenu';
import { logActivity } from '../../utils/activity';
import { subscribeToProjects, createProject, updateProject, ProjectData } from '../../services/projectService';
import { PageTransition } from '../../components/common/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';

const statusIconMap: Record<string, any> = {
  active: CheckCircle2,
  planning: CircleDashed,
  on_hold: PauseCircle,
  completed: CheckCircle2,
};

const statusColors: Record<string, string> = {
  active: 'text-green-600 bg-green-50',
  planning: 'text-blue-600 bg-blue-50',
  on_hold: 'text-amber-600 bg-amber-50',
  completed: 'text-slate-600 bg-slate-100',
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const navigate = useNavigate();
  const [dbData, setDbData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProjects(isAdmin, user.projectAccess || [], (data) => {
      const mappedDocs = data.map(p => ({
        ...p,
        title: p.name,
        deadline: 'TBD',
        progress: p.status === 'completed' ? 100 : (p.status === 'active' ? 45 : 0),
        members: 1
      }));
      setDbData(mappedDocs);
      setIsLoading(false);
    });
    return () => unsub();
  }, [user, isAdmin]);

  const accessibleData = useMemo(() => {
    const dummyMapped = PROJECTS_DATA.map(p => ({ 
      ...p, 
      id: p.id,
      name: p.title,
      clientId: 'dummy',
      clientName: p.client,
      status: p.status as any
    }));
    const filteredDummy = isAdmin ? dummyMapped : dummyMapped.filter(p => user?.projectAccess?.includes(p.id));
    
    return [...dbData, ...filteredDummy];
  }, [user, isAdmin, dbData]);

  const [data, setData] = useState(accessibleData);
  
  useEffect(() => {
    setData(accessibleData);
  }, [accessibleData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', clientName: '', status: 'active', deadline: '' });

  const [statusFilter, setStatusFilter] = useState('All Projects');
  const { searchTerm, setSearchTerm, filteredData: searchedData } = useSearch(data, ['name', 'clientName']);

  const filteredData = useMemo(() => {
    if (statusFilter === 'All Projects') return searchedData;
    const filterKey = statusFilter.toLowerCase().replace(' ', '_');
    return searchedData.filter(p => p.status === filterKey);
  }, [searchedData, statusFilter]);

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      setFormData({ name: project.name || project.title, clientName: project.clientName || project.client, status: project.status, deadline: project.deadline || 'TBD' });
    } else {
      setEditingProject(null);
      setFormData({ name: '', clientName: '', status: 'active', deadline: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      if (editingProject.id.length > 10) {
        await updateProject(editingProject.id, {
          name: formData.name,
          clientName: formData.clientName,
          status: formData.status as any
        });
      }
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'updated project',
        target: formData.name,
        type: 'project',
        projectId: editingProject.id
      });
    } else {
      const id = await createProject({
        name: formData.name,
        clientName: formData.clientName,
        status: formData.status as any,
        clientId: 'manual-entry'
      });

      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'created project',
        target: formData.name,
        type: 'project',
        projectId: id || 'unknown'
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const project = data.find(p => p.id === id);
    if (confirm('Are you sure you want to archive this project?')) {
      setData(data.filter(p => p.id !== id));
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'archived project',
        target: project?.title || 'Unknown',
        type: 'project',
        projectId: id
      });
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Active Projects</h2>
            <p className="text-text-secondary text-[13px]">Track timelines and resourcing across the portfolio.</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
            >
              <Plus size={16} />
              + New Project
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Filter projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md text-[13px] focus:outline-none focus:border-primary transition-all text-text-secondary outline-none appearance-none"
            >
              <option>All Projects</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-md border border-border p-6 shadow-sm animate-pulse space-y-4">
                <div className="flex justify-between">
                   <div className="h-4 bg-bg-light rounded-md w-20" />
                   <div className="h-4 bg-bg-light rounded-md w-24" />
                </div>
                <div className="h-6 bg-bg-light rounded-md w-3/4" />
                <div className="space-y-2">
                   <div className="h-2 bg-bg-light rounded-md w-full" />
                   <div className="h-2 bg-bg-light rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((project) => {
              const Icon = statusIconMap[project.status] || CircleDashed;
              const statusLabel = (project.status as string).replace('_', ' ');
              const projectName = project.name || project.title;
              const clientName = project.clientName || project.client;
              return (
                <div key={project.id} className="bg-white rounded-md border border-border shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        project.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                        project.status === 'planning' ? 'bg-primary/10 text-primary border-primary/20' :
                        project.status === 'on_hold' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                         <Icon size={12} />
                         {statusLabel}
                      </span>
                      <div className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">{clientName}</div>
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-[15px] font-bold text-text-primary group-hover:text-primary transition-colors leading-snug">{projectName}</h3>
                      {isAdmin && (
                        <ActionMenu 
                          items={[
                            { label: 'Edit Project', onClick: () => handleOpenModal(project), icon: Edit },
                            { label: 'Archive', onClick: () => handleDelete(project.id), variant: 'danger', icon: Trash2 },
                          ]}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-text-secondary mb-5">
                      <div className="flex items-center gap-1.5"><Calendar size={14} /> {project.deadline}</div>
                      <div className="flex items-center gap-1.5"><Users size={14} /> {(project as any).members} Members</div>
                    </div>

                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center justify-between text-[11px] font-bold text-text-primary">
                        <span>Progress</span>
                        <span>{(project as any).progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-md overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-md transition-all duration-500 shadow-[0_0_8px_rgba(124,92,255,0.4)]" 
                          style={{ width: `${(project as any).progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-bg-light/30 border-t border-border flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-md bg-white border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary shadow-sm">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                      {(project as any).members > 3 && (
                        <div className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[9px] font-bold">+{(project as any).members - 3}</div>
                      )}
                    </div>
                    <button 
                      onClick={() => navigate('/explorer')}
                      className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      Explorer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProject ? 'Edit Project' : 'New Project'}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded-md transition-all">Cancel</button>
            <button onClick={handleSubmit} className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm shadow-primary/20 transition-all active:scale-95">
              {editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input 
            label="Project Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            placeholder="e.g. Website Redesign"
            required
          />
          <Input 
            label="Client Name" 
            value={formData.clientName} 
            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} 
            placeholder="e.g. Acme Corp"
            required
          />
          <Input 
            label="Deadline" 
            type="text"
            value={formData.deadline} 
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} 
            placeholder="e.g. June 15, 2026"
            required
          />
          <Select 
            label="Status" 
            value={formData.status} 
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { label: 'Planning', value: 'planning' },
              { label: 'Active', value: 'active' },
              { label: 'On Hold', value: 'on_hold' },
              { label: 'Completed', value: 'completed' },
            ]}
          />
        </form>
      </Modal>
      </div>
    </PageTransition>
  );
}

