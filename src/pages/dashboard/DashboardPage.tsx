import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { Users, Briefcase, TrendingUp, Clock, Plus, FolderOpen, Search, Mail, MoreVertical, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { EmailModal } from '../../components/common/EmailModal';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import { PageTransition } from '../../components/common/PageTransition';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { REVENUE_DATA, SALES_FORECAST, DEAL_OVERVIEW } from '../../dummy-data/charts';

const COLORS = ['#7c5cff', '#0ab39c', '#f7b84b', '#f06548'];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const stats = useDashboardStats(user);
  const { activities: realActivities, loading: loadingActivities } = useRecentActivity(user);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isUp = stat.status === 'up';
            return (
              <div key={stat.id} className="p-5 bg-white rounded-md border border-border shadow-sm flex items-center gap-4 relative overflow-hidden group">
                <div className={cn(
                  "w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
                  stat.status === 'up' ? "bg-success/10 text-success" : 
                  stat.status === 'down' ? "bg-danger/10 text-danger" : 
                  "bg-primary/10 text-primary"
                )}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-1">{stat.label}</p>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">{stat.value}</h3>
                  {stat.trend && (
                    <div className={cn(
                      "absolute top-5 right-5 text-[11px] font-bold flex items-center gap-0.5",
                      isUp ? "text-success" : "text-danger"
                    )}>
                      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {stat.trend}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expenses Chart */}
          <div className="lg:col-span-2 bg-white rounded-md border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-text-primary text-[15px]">Revenue vs Expenses</h3>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-[11px] text-text-secondary font-medium">Revenue</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-[11px] text-text-secondary font-medium">Expenses</span>
                 </div>
                 <button className="p-1 hover:bg-slate-50 rounded text-slate-400"><MoreVertical size={16} /></button>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cff" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#7c5cff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#878a99', fontSize: 11}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#878a99', fontSize: 11}} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#7c5cff" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expenses" stroke="#0ab39c" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deal Overview (Donut) */}
          <div className="bg-white rounded-md border border-border shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-text-primary text-[15px]">Deal Overview</h3>
               <button className="text-[11px] font-bold text-primary hover:underline uppercase tracking-tighter">Report</button>
            </div>
            <div className="h-[240px] flex-shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEAL_OVERVIEW}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {DEAL_OVERVIEW.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-auto space-y-3">
               {DEAL_OVERVIEW.map((item) => (
                 <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                       <span className="text-[13px] font-medium text-text-secondary">{item.name}</span>
                    </div>
                    <span className="text-[13px] font-bold text-text-primary">{item.value} Deals</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Forecast */}
          <div className="bg-white rounded-md border border-border shadow-sm p-6">
            <h3 className="font-bold text-text-primary text-[15px] mb-6">Sales Forecast</h3>
            <div className="h-[250px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SALES_FORECAST}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#878a99', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#878a99', fontSize: 11}} />
                    <Tooltip cursor={{fill: '#f3f6f9'}} />
                    <Bar dataKey="target" fill="#7c5cff" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="actual" fill="#e9ebf0" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-md border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 px-6 border-b border-border flex items-center justify-between bg-table-header/50">
              <h3 className="font-bold text-text-primary text-[15px]">Recent Activity</h3>
              <button className="text-[11px] font-bold text-primary hover:underline uppercase tracking-tighter">View All</button>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[250px] custom-scrollbar">
              {loadingActivities ? (
                 <div className="p-6 text-center text-slate-400 text-xs">Loading...</div>
              ) : realActivities.length > 0 ? realActivities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="p-4 px-6 flex items-start gap-3 hover:bg-slate-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-primary leading-snug">
                      <span className="font-bold">{activity.userName}</span> {activity.action} <span className="font-semibold text-primary">{activity.target}</span>
                    </p>
                    <p className="text-[11px] text-text-secondary mt-1">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center text-slate-400 text-sm font-medium">No recent activity found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="bg-white rounded-md border border-border shadow-sm p-4 flex flex-wrap items-center gap-4">
           <span className="text-[13px] font-bold text-text-secondary uppercase tracking-widest mr-2">Quick Actions:</span>
           {[
             { label: 'Add Client', icon: Plus, to: '/clients', adminOnly: true },
             { label: 'New Project', icon: FolderOpen, to: '/projects', adminOnly: true },
             { label: 'Send Email', icon: Mail, onClick: () => setIsEmailModalOpen(true) },
             { label: 'File Search', icon: Search, to: '/explorer' },
           ].filter(action => !action.adminOnly || isAdmin).map((action) => (
             <button 
               key={action.label}
               onClick={() => action.to ? navigate(action.to) : action.onClick?.()}
               className="flex items-center gap-2 px-4 py-2 text-[12px] font-bold text-text-primary bg-bg-light hover:bg-primary hover:text-white rounded-md transition-all border border-transparent shadow-sm"
             >
               <action.icon size={14} />
               {action.label}
             </button>
           ))}
        </div>

        <EmailModal 
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          type="team"
        />
      </div>
    </PageTransition>
  );
}

