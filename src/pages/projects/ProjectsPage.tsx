import { useState, useMemo } from 'react';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { Calendar, Users, CheckCircle2, CircleDashed, PauseCircle, Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { ActionMenu } from '../../components/common/ActionMenu';

const statusIcons: Record<string, any> = {
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
  
  const accessibleData = useMemo(() => {
    if (isAdmin) return PROJECTS_DATA;
    return PROJECTS_DATA.filter(p => user?.projectAccess?.includes(p.id));
  }, [user, isAdmin]);

  const [data, setData] = useState(accessibleData);
  
  // Sync data if accessibleData changes (e.g. login/role change)
  useMemo(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      setData(data.map(p => p.id === editingProject.id ? { ...p, ...formData } : p));
    } else {
      const newProject = {
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        progress: 0,
        members: 1
      };
      setData([newProject, ...data]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to archive this project?')) {
      setData(data.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Projects</h2>
          <p className="text-slate-500 text-sm">Track timelines and resource allocation across your portfolio.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredData.map((project) => {
          const StatusIcon = statusIcons[project.status] || CircleDashed;
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
                <div className="flex items-center justify-between mb-4 mr-8">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[project.status]}`}>
                    <StatusIcon size={12} />
                    {project.status.replace('_', ' ')}
                  </div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{project.client}</div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors pr-10">{project.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> Due {project.deadline}</div>
                  <div className="flex items-center gap-1.5"><Users size={14} /> {project.members} members</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                      style={{ width: `${project.progress}%` }}
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
                   {project.members > 3 && (
                     <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">+{project.members - 3}</div>
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
  );
}

