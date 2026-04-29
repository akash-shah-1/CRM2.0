import { useMemo } from 'react';
import { DASHBOARD_STATS, RECENT_ACTIVITY } from '../../dummy-data/dashboard';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { CLIENTS_DATA } from '../../dummy-data/clients';
import { useAuth } from '../../store/AuthContext';
import { Users, Briefcase, TrendingUp, Clock, Plus, FolderOpen, Calendar, Shield, Search } from 'lucide-react';

const iconMap: Record<string, any> = {
  '1': Users,
  '2': Briefcase,
  '3': Users,
  '4': TrendingUp,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const userProjects = useMemo(() => {
    if (isAdmin) return PROJECTS_DATA;
    return PROJECTS_DATA.filter(p => user?.projectAccess?.includes(p.id));
  }, [user, isAdmin]);

  const stats = useMemo(() => {
    return [
      { id: '1', label: 'Total Clients', value: CLIENTS_DATA.length.toString(), trend: '+2', status: 'up', icon: Users },
      { id: '2', label: 'My Projects', value: userProjects.length.toString(), trend: '', status: 'neutral', icon: Briefcase },
      { id: '3', label: 'Active Tasks', value: '14', trend: '+5', status: 'up', icon: Calendar },
      { id: '4', label: 'Completed', value: userProjects.filter(p => p.status === 'completed').length.toString(), trend: '100%', status: 'up', icon: TrendingUp },
    ];
  }, [userProjects]);

  const filteredActivity = useMemo(() => {
    if (isAdmin) return RECENT_ACTIVITY;
    // Mock filtering activity by project title
    const projectTitles = userProjects.map(p => p.title);
    return RECENT_ACTIVITY.filter(a => a.type !== 'project' || projectTitles.includes(a.target));
  }, [userProjects, isAdmin]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-slate-500 text-sm">Welcome back, {user?.displayName}.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
              <Shield size={12} />
              {user?.role} Access
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Icon size={20} />
                </div>
                {stat.trend && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                    stat.status === 'up' ? 'bg-green-50 text-green-600' : 
                    stat.status === 'down' ? 'bg-red-50 text-red-600' : 
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</div>
            </div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Recent Activity</h3>
            <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tighter">View All logs</button>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
            {filteredActivity.length > 0 ? filteredActivity.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:border-blue-100 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <Clock size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">{activity.user}</span> {activity.action} <span className="font-bold text-slate-800 border-b border-slate-200">{activity.target}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-slate-400 text-sm font-medium">No recent activity for your projects.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-widest mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { label: 'Add New Client', icon: Plus },
                { label: 'Create Project', icon: FolderOpen },
                { label: 'Project Explorer', icon: Search },
                { label: 'Upload Document', icon: Plus },
              ].map((action) => (
                <button 
                  key={action.label}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 rounded-xl transition-all border border-slate-100 flex items-center justify-between group"
                >
                  {action.label}
                  <action.icon size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6 text-white overflow-hidden relative group">
             <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-colors" />
             <h4 className="font-bold text-lg mb-2 relative z-10">Resource Center</h4>
             <p className="text-slate-400 text-xs mb-4 leading-relaxed relative z-10">Access documentation, training materials, and brand guidelines for your projects.</p>
             <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors relative z-10">Open Explorer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
