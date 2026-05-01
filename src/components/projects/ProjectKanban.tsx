import { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  CircleDashed, 
  PauseCircle, 
  Clock, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ProjectData, updateProject } from '../../services/projectService';

interface ProjectKanbanProps {
  projects: ProjectData[];
  onOpenDetails: (project: ProjectData) => void;
}

const STAGES = [
  { id: 'lead', title: 'Leads / Discovery', icon: CircleDashed, color: 'bg-blue-600' },
  { id: 'active', title: 'In Development', icon: Clock, color: 'bg-primary' },
  { id: 'on_hold', title: 'On Hold / Review', icon: PauseCircle, color: 'bg-amber-600' },
  { id: 'completed', title: 'Live / Completed', icon: CheckCircle2, color: 'bg-success' },
];

export function ProjectKanban({ projects, onOpenDetails }: ProjectKanbanProps) {
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const projectId = e.dataTransfer.getData('projectId');
    if (!projectId) return;
    
    // Update local state is handled by the subscription in ProjectsPage
    await updateProject(projectId, { status: newStatus as any });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('projectId', id);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar min-h-[600px]">
      {STAGES.map((stage) => {
        const stageProjects = projects.filter(p => p.status === stage.id);
        const Icon = stage.icon;
        
        return (
          <div 
            key={stage.id} 
            className="flex-shrink-0 w-80 bg-bg-light/30 rounded-xl border border-border flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div className={`p-4 border-b border-border flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">{stage.title}</h3>
                <span className="ml-2 px-2 py-0.5 bg-white border border-border rounded-full text-[10px] font-bold text-text-secondary">
                  {stageProjects.length}
                </span>
              </div>
              <Icon size={16} className="text-text-secondary opacity-40" />
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar">
              {stageProjects.map((project) => (
                <motion.div
                  layoutId={project.id}
                  key={project.id}
                  draggable
                  onDragStart={(e: any) => handleDragStart(e, project.id!)}
                  onClick={() => onOpenDetails(project)}
                  className="bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-move group relative"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">
                         {project.clientName || project.clientId}
                       </span>
                       <div className="text-[11px] font-medium text-text-secondary">
                         ${(project.price || 0).toLocaleString()}
                       </div>
                    </div>

                    <h4 className="text-[14px] font-bold text-text-primary group-hover:text-primary transition-colors leading-tight">
                      {project.title}
                    </h4>

                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.techStack.slice(0, 3).map((tool, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                            {tool}
                          </span>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                            +{project.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <div className="flex -space-x-1">
                         {[1, 2].map(i => (
                           <div key={i} className="w-6 h-6 rounded-md bg-slate-100 border border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                             {String.fromCharCode(64 + i)}
                           </div>
                         ))}
                      </div>
                      <button className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {stageProjects.length === 0 && (
                <div className="h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-[11px] text-text-secondary font-medium italic opacity-40">
                  Drop project here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
