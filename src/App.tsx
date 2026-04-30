/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { cn } from './utils/cn';
import { LayoutDashboard, Users, Briefcase, ChevronRight, LogOut, Shield, FileText, FolderOpen, Lock, LayoutGrid, Send, Bell, Mail } from 'lucide-react';
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


const NavItem = ({ to, icon: Icon, label, moduleId }: { to: string, icon: any, label: string, moduleId: string }) => {
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
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon size={18} className={isActive ? "text-blue-600" : "text-slate-400"} />
      {label}
    </Link>
  );
};

// Placeholder Layout
const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  
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
    <div className="flex min-h-screen bg-slate-50">
      <NotificationBanner />
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100 font-bold text-xl tracking-tight leading-none">
          Nexus <span className="text-blue-600 block text-[10px] uppercase font-bold tracking-[0.2em] mt-1">Enterprise</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3 px-3">Main Menu</div>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" moduleId="dashboard" />
          <NavItem to="/clients" icon={Users} label="Clients" moduleId="clients" />
          <NavItem to="/projects" icon={Briefcase} label="Projects" moduleId="projects" />
          <NavItem to="/teams" icon={Shield} label="Team" moduleId="teams" />
          <div className="mt-8 mb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Productivity</div>
          <NavItem to="/explorer" icon={LayoutGrid} label="Explorer" moduleId="explorer" />
          <NavItem to="/notes" icon={FileText} label="Notes" moduleId="notes" />
          <NavItem to="/documents" icon={FolderOpen} label="Documents" moduleId="documents" />
          {user?.role === 'admin' && <NavItem to="/vault" icon={Lock} label="Vault" moduleId="vault" />}
          <div className="mt-8 mb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Communication</div>
          <NavItem to="/chat" icon={Send} label="Chat" moduleId="chat" />
          <NavItem to="/communication" icon={Mail} label="Correspondence" moduleId="communication" />
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 group">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
               {user?.avatarUrl ? (
                 <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                   {user?.displayName?.charAt(0)}
                 </div>
               )}
            </div>
            <div className="flex-1 min-w-0">
               <div className="text-sm font-medium text-slate-900 truncate">{user?.displayName}</div>
               <div className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-bold">{user?.role}</div>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full mt-2 flex items-center justify-between px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Sign Out
            <LogOut size={14} />
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <h1 className="font-bold text-slate-900 text-sm uppercase tracking-widest leading-none">{getPageTitle()}</h1>
          <div className="flex items-center gap-4">
             <NotificationCenter />
          </div>
        </header>
        <div className="p-6 md:p-8 flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
        <nav className="md:hidden sticky bottom-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-4 z-20">
          <Link to="/dashboard" className={cn("flex flex-col items-center gap-1", location.pathname === '/dashboard' ? "text-blue-600" : "text-slate-400")}>
             <LayoutDashboard size={20} />
             <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link to="/clients" className={cn("flex flex-col items-center gap-1", location.pathname === '/clients' ? "text-blue-600" : "text-slate-400")}>
             <Users size={20} />
             <span className="text-[10px] font-bold">Clients</span>
          </Link>
          <Link to="/teams" className={cn("flex flex-col items-center gap-1", location.pathname === '/teams' ? "text-blue-600" : "text-slate-400")}>
             <Shield size={20} />
             <span className="text-[10px] font-bold">Team</span>
          </Link>
          <button onClick={() => logout()} className="flex flex-col items-center gap-1 text-red-400">
             <LogOut size={20} />
             <span className="text-[10px] font-bold">Logout</span>
          </button>
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


