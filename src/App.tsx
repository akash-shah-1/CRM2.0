/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { cn } from './utils/cn';
import { LayoutDashboard, Users, Briefcase, ChevronRight, LogOut, Shield, FileText, FolderOpen, Lock, LayoutGrid, Send, Bell, Mail, Search, Plus } from 'lucide-react';
import { NotificationCenter } from './components/common/NotificationCenter';
import { NotificationBanner } from './components/common/NotificationBanner';



// Lazy load pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'));
const TeamsPage = lazy(() => import('./pages/teams/TeamsPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectExplorer = lazy(() => import('./pages/explorer/ProjectExplorer'));
const NotesPage = lazy(() => import('./pages/notes/NotesPage'));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const VaultPage = lazy(() => import('./pages/vault/VaultPage'));
const ChatPage = lazy(() => import('./pages/chat/ChatPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const CommunicationPage = lazy(() => import('./pages/communication/CommunicationPage'));



// Protected Route Component
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center font-medium text-slate-500">Authenticating...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={hasPermission(user, 'dashboard') ? <DashboardPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/clients" element={hasPermission(user, 'clients') ? <ClientsPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/teams" element={hasPermission(user, 'teams') ? <TeamsPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/projects" element={hasPermission(user, 'projects') ? <ProjectsPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/explorer" element={hasPermission(user, 'explorer') ? <ProjectExplorer /> : <Navigate to="/dashboard" replace />} />
        <Route path="/notes" element={hasPermission(user, 'notes') ? <NotesPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/documents" element={hasPermission(user, 'documents') ? <DocumentsPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/vault" element={user.role === 'admin' ? <VaultPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/chat" element={hasPermission(user, 'chat') ? <ChatPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/communication" element={hasPermission(user, 'communication') ? <CommunicationPage /> : <Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div className="text-center py-20 text-slate-400">Page not found</div>} />
      </Routes>
    </DashboardLayout>
  );
};


const hasPermission = (user: any, moduleId: string) => {
  if (!user || user.status === 'disabled') return false;
  return user.role === 'admin' || user.permissions?.includes(moduleId);
};


// Sidebar Item Component
const NavItem = ({ to, icon: Icon, label, moduleId, isCollapsed }: { to: string, icon: any, label: string, moduleId: string, isCollapsed: boolean }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isActive = location.pathname === to;
  
  // Permission check
  const hasPermission = user?.role === 'admin' || user?.permissions?.includes(moduleId);
  if (!hasPermission) return null;

  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-200 group",
        isActive 
          ? "bg-sidebar-item-active text-white" 
          : "text-slate-300 hover:bg-sidebar-item-hover hover:text-white"
      )}
      title={isCollapsed ? label : ""}
    >
      <Icon size={18} className={cn(
        "transition-colors",
        isActive ? "text-white" : "text-slate-400 group-hover:text-white"
      )} />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
};

// Main Layout Component
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/clients') return 'Clients';
    if (path === '/teams') return 'Team Management';
    if (path === '/projects') return 'Project Management';
    if (path === '/explorer') return 'Project Explorer';
    if (path === '/notes') return 'Notes System';
    if (path === '/documents') return 'Document Center';
    if (path === '/vault') return 'Safe Vault';
    if (path === '/chat') return 'Team Communication';
    if (path === '/communication') return 'Correspondence';
    return 'Nexus';
  };

  return (
    <div className="flex min-h-screen bg-bg-light">
      <NotificationBanner />
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-sidebar-bg transition-all duration-300 relative z-30",
          isCollapsed ? "w-20" : "w-[260px]"
        )}
      >
        <div className={cn(
          "h-16 flex items-center px-6 border-b border-white/5",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}>
          {!isCollapsed && (
            <div className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
               <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">N</div>
               <span>Nexus</span>
            </div>
          )}
          {isCollapsed && <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold text-white">N</div>}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-all",
              isCollapsed && "hidden" // Or reposition
            )}
          >
            <ChevronRight size={18} className={cn("transition-transform", !isCollapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && <div className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-4 mb-3 px-3 opacity-60">Main Menu</div>}
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" moduleId="dashboard" isCollapsed={isCollapsed} />
          <NavItem to="/clients" icon={Users} label="Clients" moduleId="clients" isCollapsed={isCollapsed} />
          <NavItem to="/projects" icon={Briefcase} label="Projects" moduleId="projects" isCollapsed={isCollapsed} />
          <NavItem to="/teams" icon={Shield} label="Team" moduleId="teams" isCollapsed={isCollapsed} />
          
          {!isCollapsed && <div className="mt-8 mb-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Productivity</div>}
          <NavItem to="/explorer" icon={LayoutGrid} label="Explorer" moduleId="explorer" isCollapsed={isCollapsed} />
          <NavItem to="/notes" icon={FileText} label="Notes" moduleId="notes" isCollapsed={isCollapsed} />
          <NavItem to="/documents" icon={FolderOpen} label="Documents" moduleId="documents" isCollapsed={isCollapsed} />
          {user?.role === 'admin' && <NavItem to="/vault" icon={Lock} label="Vault" moduleId="vault" isCollapsed={isCollapsed} />}
          
          {!isCollapsed && <div className="mt-8 mb-2 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Communication</div>}
          <NavItem to="/chat" icon={Send} label="Chat" moduleId="chat" isCollapsed={isCollapsed} />
          <NavItem to="/communication" icon={Mail} label="Correspondence" moduleId="communication" isCollapsed={isCollapsed} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link to="/profile" className={cn("flex items-center gap-3 px-2 py-2 group cursor-pointer", isCollapsed && "justify-center px-0")}>
            <div className="w-8 h-8 rounded-md bg-white/10 border border-white/10 overflow-hidden flex-shrink-0 transition-transform group-hover:scale-110">
               {user?.avatarUrl ? (
                 <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                   {user?.displayName?.charAt(0)}
                 </div>
               )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                 <div className="text-[13px] font-semibold text-white truncate">{user?.displayName}</div>
                 <div className="text-[10px] text-slate-400 truncate uppercase tracking-wider">{user?.role}</div>
              </div>
            )}
          </Link>
          {!isCollapsed && (
            <button 
              onClick={() => logout()}
              className="w-full mt-2 flex items-center justify-between px-3 py-2 text-[12px] font-semibold text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              Sign Out
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-[70px] bg-white border-b border-border px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-slate-500 hover:bg-slate-50 rounded-md hidden md:block"
            >
              <LayoutGrid size={20} />
            </button>
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-bg-light border-none rounded-md text-[13px] w-64 focus:ring-1 focus:ring-primary/20 transition-all outline-none" 
              />
            </div>
            <div className="md:hidden font-bold text-slate-900 tracking-tight">Nexus</div>
          </div>

          <div className="flex items-center gap-2">
             <Link to="/profile" className="flex items-center gap-1 group px-4 py-1.5 rounded-full hover:bg-slate-50 cursor-pointer hidden sm:flex border border-transparent hover:border-border transition-all">
                <div className="text-right mr-2 hidden xl:block">
                  <div className="text-[12px] font-bold text-slate-900 leading-none">{user?.displayName}</div>
                  <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{user?.role}</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-border">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-400 text-xs">{user?.displayName?.charAt(0)}</div>
                  )}
                </div>
             </Link>
             <div className="h-4 w-[1px] bg-border mx-2 hidden sm:block"></div>
             <NotificationCenter />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">
            <div className="flex items-baseline justify-between mb-6">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">{getPageTitle()}</h1>
              <div className="text-[11px] text-text-secondary font-medium flex items-center gap-2">
                <span>Nexus</span> 
                <ChevronRight size={10} /> 
                <span className="text-primary font-bold uppercase tracking-wider">{getPageTitle()}</span>
              </div>
            </div>
            {children}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden sticky bottom-0 bg-white border-t border-border h-[65px] flex items-center justify-around px-4 z-20 shadow-[0_-2px_15px_rgba(0,0,0,0.04)]">
          <Link to="/dashboard" className={cn("flex flex-col items-center gap-1 min-w-[60px] transition-all", location.pathname === '/dashboard' ? "text-primary" : "text-text-secondary hover:text-text-primary")}>
             <LayoutDashboard size={20} className={cn(location.pathname === '/dashboard' && "animate-in zoom-in duration-300")} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
          </Link>
          <Link to="/clients" className={cn("flex flex-col items-center gap-1 min-w-[60px] transition-all", location.pathname === '/clients' ? "text-primary" : "text-text-secondary hover:text-text-primary")}>
             <Users size={20} className={cn(location.pathname === '/clients' && "animate-in zoom-in duration-300")} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Clients</span>
          </Link>
          
          <div className="relative -mt-8 flex flex-col items-center gap-1 group">
            <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-white active:scale-90 transition-all cursor-pointer">
               <Plus size={24} />
            </div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">Quick</span>
          </div>

          <Link to="/projects" className={cn("flex flex-col items-center gap-1 min-w-[60px] transition-all", location.pathname === '/projects' ? "text-primary" : "text-text-secondary hover:text-text-primary")}>
             <Briefcase size={20} className={cn(location.pathname === '/projects' && "animate-in zoom-in duration-300")} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Work</span>
          </Link>
          <Link to="/chat" className={cn("flex flex-col items-center gap-1 min-w-[60px] transition-all", location.pathname === '/chat' ? "text-primary" : "text-text-secondary hover:text-text-primary")}>
             <Send size={20} className={cn(location.pathname === '/chat' && "animate-in zoom-in duration-300")} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
          </Link>
        </nav>
      </main>
    </div>
  );
};


export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center font-medium text-slate-500">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedRoute />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}


