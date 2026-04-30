import { useState, useEffect, useMemo } from 'react';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { Calendar, Users, CheckCircle2, CircleDashed, PauseCircle, Plus, Search, Edit, Trash2 } from 'lucide-react';
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
  
  const [dbData, setDbData] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProjects(isAdmin, user.projectAccess || [], (data) => {
      // Map Firestore fields to local UI fields if necessary
      const mappedDocs = data.map(p => ({
        ...p,
        title: p.name, // The dummy data uses 'title', but Firestore uses 'name'
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
    // Merge dummy data
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
  const [formData, setFormData] = useState({ title: '', client: '', status: 'active', deadline: '' });

  const [statusFilter, setStatusFilter] = useState('All Projects');
  const { searchTerm, setSearchTerm, filteredData: searchedData } = useSearch(data, ['title', 'client']);

  const filteredData = useMemo(() => {
    if (statusFilter === 'All Projects') return searchedData;
    const filterKey = statusFilter.toLowerCase().replace(' ', '_');
    return searchedData.filter(p => p.status === filterKey);
  }, [searchedData, statusFilter]);

  const handleOpenModal = (project?: any) => {
    if (project) {
      setEditingProject(project);
      setFormData({ title: project.title, client: project.client, status: project.status, deadline: project.deadline });
    } else {
      setEditingProject(null);
      setFormData({ title: '', client: '', status: 'active', deadline: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      if (editingProject.id.length > 10) { // Firestore Ref
        await updateProject(editingProject.id, {
          name: formData.title,
          clientId: formData.client,
          status: formData.status as any
        });
      }
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'updated project',
        target: formData.title,
        type: 'project',
        projectId: editingProject.id
      });
    } else {
      const id = await createProject({
        name: formData.title,
        clientId: formData.client,
        status: formData.status as any
      });

      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'created project',
        target: formData.title,
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
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Projects</h2>
            <p className="text-slate-500 text-sm text-left">Track timelines and resource allocation across your portfolio.</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm transition-all active:scale-95"
            >
              <Plus size={18} />
              New Project
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10 shadow-sm"
          >
            <option>All Projects</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex justify-between">
                   <Skeleton className="h-6 w-24 rounded-full" />
                   <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-full" />
                <div className="flex gap-4">
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredData.map((project) => {
              const Icon = statusIconMap[project.status] || CircleDashed;
              return (
                <div key={project.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group relative">
                  {isAdmin && (
                    <div className="absolute top-4 right-4">
                      <ActionMenu 
                        items={[
                          { label: 'Edit Project', onClick: () => handleOpenModal(project), icon: Edit },
                          { label: 'Archive Project', onClick: () => handleDelete(project.id), variant: 'danger', icon: Trash2 },
                        ]}
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4 mr-8 text-left">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[project.status]}`}>
                        <Icon size={12} />
                        {(project.status as string).replace('_', ' ')}
                      </div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{project.client || (project as any).clientName}</div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors pr-10 text-left">{project.title || (project as any).name}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5"><Calendar size={14} /> Due {project.deadline}</div>
                      <div className="flex items-center gap-1.5"><Users size={14} /> {(project as any).members} members</div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Progress</span>
                        <span>{(project as any).progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${(project as any).progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-7 h-7 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                      {(project as any).members > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">+{(project as any).members - 3}</div>
                      )}
                    </div>
                    <button className="text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest transition-colors font-mono">
                      View Case Study
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
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
              {editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input 
            label="Project Title" 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
            placeholder="e.g. Website Redesign"
            required
          />
          <Input 
            label="Client" 
            value={formData.client} 
            onChange={(e) => setFormData({ ...formData, client: e.target.value })} 
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

