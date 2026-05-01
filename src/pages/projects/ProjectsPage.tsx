import { useState, useEffect, useMemo } from 'react';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  CircleDashed, 
  PauseCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Filter,
  LayoutGrid,
  List as ListIcon,
  Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { ActionMenu } from '../../components/common/ActionMenu';
import { logActivity } from '../../utils/activity';
import { subscribeToProjects, createProject, updateProject, ProjectData } from '../../services/projectService';
import { PageTransition } from '../../components/common/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';
import { ProjectKanban } from '../../components/projects/ProjectKanban';
import { ProjectDetailModal } from '../../components/projects/ProjectDetailModal';
import { ClientProjectWizard } from '../../components/clients/ClientProjectWizard';

const statusIconMap: Record<string, any> = {
  active: CheckCircle2,
  planning: CircleDashed,
  on_hold: PauseCircle,
  completed: CheckCircle2,
  lead: CircleDashed
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const navigate = useNavigate();
  const [dbData, setDbData] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToProjects(isAdmin, user.projectAccess || [], (data) => {
      setDbData(data);
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
      status: p.status === 'planning' ? 'lead' : p.status as any,
      price: 5000,
      createdAt: Date.now()
    })) as ProjectData[];
    const filteredDummy = isAdmin ? dummyMapped : dummyMapped.filter(p => user?.projectAccess?.includes(p.id!));
    
    return [...dbData, ...filteredDummy];
  }, [user, isAdmin, dbData]);

  const [data, setData] = useState(accessibleData);
  
  useEffect(() => {
    setData(accessibleData);
  }, [accessibleData]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);

  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', clientName: '', status: 'active', deadline: '' });

  const [statusFilter, setStatusFilter] = useState('All Projects');
  const { searchTerm, setSearchTerm, filteredData: searchedData } = useSearch(data, ['title', 'clientName']);

  const filteredData = useMemo(() => {
    if (statusFilter === 'All Projects') return searchedData;
    const filterKey = statusFilter.toLowerCase().replace(' ', '_');
    return searchedData.filter(p => p.status === filterKey);
  }, [searchedData, statusFilter]);

  const handleOpenDetails = (project: ProjectData) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  const handleOpenEditModal = (project: any) => {
    setEditingProject(project);
    setFormData({ 
      name: project.title, 
      clientName: project.clientName || project.client, 
      status: project.status, 
      deadline: '' 
    });
    setIsModalOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject && editingProject.id.length > 10) {
      await updateProject(editingProject.id, {
        title: formData.name,
        status: formData.status as any
      });
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'updated project',
        target: formData.name,
        type: 'project',
        projectId: editingProject.id
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
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Project Portfolio</h2>
            <p className="text-text-secondary text-[13px]">Manage full project lifecycle from lead to live.</p>
          </div>
          <div className="flex items-center gap-3">
             {/* View Toggle */}
             <div className="flex items-center bg-white border border-border rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-bg-light'}`}
                  title="Kanban View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:bg-bg-light'}`}
                  title="List View"
                >
                  <ListIcon size={18} />
                </button>
             </div>

            {isAdmin && (
              <button 
                onClick={() => setIsWizardOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
              >
                <Plus size={16} />
                New Client & Project
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Filter by title or client..." 
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
              <option value="lead">Discovery / Lead</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
            ))}
          </div>
        ) : viewMode === 'kanban' ? (
          <ProjectKanban projects={filteredData} onOpenDetails={handleOpenDetails} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((project) => {
              const Icon = statusIconMap[project.status] || CircleDashed;
              const statusLabel = project.status.replace('_', ' ');
              const projectName = project.title;
              const clientName = project.clientName || project.clientId;
              const progress = project.status === 'completed' ? 100 : (project.status === 'active' ? 45 : 10);
              
              return (
                <div 
                  key={project.id} 
                  onClick={() => handleOpenDetails(project)}
                  className="bg-white rounded-md border border-border shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col cursor-pointer"
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        project.status === 'active' ? 'bg-success/10 text-success border-success/20' :
                        project.status === 'lead' ? 'bg-primary/10 text-primary border-primary/20' :
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
                            { label: 'Edit', onClick: () => handleOpenEditModal(project), icon: Edit },
                            { label: 'Archive', onClick: () => handleDelete(project.id!), variant: 'danger', icon: Trash2 },
                          ]}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-text-secondary mb-5">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} /> 
                        {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No deadline'}
                      </div>
                      <div className="flex items-center gap-1.5"><Users size={14} /> 1 Members</div>
                    </div>

                    <div className="space-y-2 mt-auto">
                      <div className="flex items-center justify-between text-[11px] font-bold text-text-primary">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-md overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-md transition-all duration-500" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-bg-light/30 border-t border-border flex items-center justify-between">
                     <div className="text-[11px] font-bold text-text-secondary">
                        EARNING: <span className="text-text-primary">${(project.price || 0).toLocaleString()}</span>
                     </div>
                    <button className="text-[11px] font-bold text-primary hover:underline uppercase tracking-wider">
                      VIEW DETAILS
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
        title="Edit Project"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded-md transition-all">Cancel</button>
            <button onClick={handleSubmitEdit} className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm shadow-primary/20 transition-all active:scale-95">
              Update Project
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmitEdit}>
          <Input 
            label="Project Title" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            required
          />
          <Select 
            label="Status" 
            value={formData.status} 
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { label: 'Discovery / Lead', value: 'lead' },
              { label: 'Active', value: 'active' },
              { label: 'On Hold', value: 'on_hold' },
              { label: 'Completed', value: 'completed' },
            ]}
          />
        </form>
      </Modal>

      <ClientProjectWizard 
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />

      {selectedProject && (
        <ProjectDetailModal 
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          project={selectedProject}
        />
      )}
      </div>
    </PageTransition>
  );
}

