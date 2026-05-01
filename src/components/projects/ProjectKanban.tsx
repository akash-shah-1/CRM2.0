import {
  CheckCircle2,
  CircleDashed,
  PauseCircle,
  Clock,
  ChevronRight,
  DollarSign
} from 'lucide-react';
import { useState } from 'react';
import { ProjectData, updateProject } from '../../services/projectService';

interface ProjectKanbanProps {
  projects: ProjectData[];
  onOpenDetails: (project: ProjectData) => void;
}

const STAGES = [
  { id: 'lead', title: 'Leads / Discovery', icon: CircleDashed, color: 'bg-blue-500', accent: 'border-blue-200', badge: 'bg-blue-50 text-blue-600' },
  { id: 'active', title: 'In Development', icon: Clock, color: 'bg-blue-500', accent: 'border-blue-200', badge: 'bg-blue-50 text-blue-600' },
  { id: 'on_hold', title: 'On Hold / Review', icon: PauseCircle, color: 'bg-slate-500', accent: 'border-slate-200', badge: 'bg-slate-50 text-slate-700' },
  { id: 'completed', title: 'Live / Completed', icon: CheckCircle2, color: 'bg-emerald-500', accent: 'border-emerald-200', badge: 'bg-emerald-50 text-emerald-700' },
];

export function ProjectKanban({ projects, onOpenDetails }: ProjectKanbanProps) {
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    setDragOverStage(null);
    setDraggingId(null);

    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (!project || project.status === newStatus) return;

    await updateProject(projectId, { status: newStatus as any });
  };

  return (
    <div className="flex gap-5 overflow-x-auto pb-4 min-h-[600px]" style={{ scrollbarWidth: 'thin' }}>
      {STAGES.map((stage) => {
        const stageProjects = projects.filter(p => p.status === stage.id);
        const Icon = stage.icon;
        const isOver = dragOverStage === stage.id;

        return (
          <div
            key={stage.id}
            className={`flex-shrink-0 w-72 xl:w-80 flex flex-col rounded-md transition-all duration-200 ${isOver
              ? 'bg-blue-50/50 border border-blue-200 shadow-sm'
              : 'bg-[#f8f9fa] border border-slate-200'
              }`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded ${stage.color} shadow-sm`} />
                <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-widest">{stage.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${stage.badge}`}>
                  {stageProjects.length}
                </span>
                <Icon size={15} className="text-slate-400" />
              </div>
            </div>

            {/* Drop Zone */}
            <div className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto" style={{ scrollbarWidth: 'thin', maxHeight: 'calc(100vh - 320px)' }}>
              {stageProjects.map((project) => {
                const isDragging = draggingId === project.id;
                return (
                  <div
                    key={project.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id!)}
                    onDragEnd={handleDragEnd}
                    onClick={() => !isDragging && onOpenDetails(project)}
                    className={`bg-white rounded-md border border-slate-200 p-4 cursor-grab active:cursor-grabbing group transition-all duration-200 select-none ${isDragging
                      ? 'opacity-40 scale-[0.98] shadow-none'
                      : 'hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    {/* Client + Price Row */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                        {project.clientName || project.clientId}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-slate-500">
                        <DollarSign size={10} />
                        {(project.price || 0).toLocaleString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[13px] font-medium text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mb-3">
                      {project.title}
                    </h4>

                    {/* Tech Stack */}
                    {project.techStack && project.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.techStack.slice(0, 3).map((tool, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded font-medium">
                            {tool}
                          </span>
                        ))}
                        {project.techStack.length > 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded font-medium">
                            +{project.techStack.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex -space-x-1.5">
                        {[1, 2].map(i => (
                          <div key={i} className="w-6 h-6 rounded-md bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-medium text-slate-600">
                            {String.fromCharCode(64 + i)}
                          </div>
                        ))}
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                );
              })}

              {/* Empty drop target */}
              {stageProjects.length === 0 && (
                <div className={`h-28 border border-dashed rounded-md flex flex-col items-center justify-center gap-1 transition-all ${isOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'
                  }`}>
                  <Icon size={18} className={isOver ? 'text-blue-500' : 'text-slate-300'} />
                  <span className="text-[12px] font-medium text-slate-400">Drop here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
