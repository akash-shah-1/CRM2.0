import { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutAuth } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../../services/firebase';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrorHandler';
import { useAuth } from '../../store/AuthContext';
import { cn } from '../../utils/cn';
import { Shield, ShieldCheck, Mail, Edit, Trash2, Search, Plus, Loader2 } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { EmailModal } from '../../components/common/EmailModal';
import { Input, Select } from '../../components/ui/FormElements';
import { UserRole, UserProfile } from '../../types/auth';

export default function TeamsPage() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<{ email: string, name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({ 
    displayName: '', 
    email: '', 
    password: '',
    role: UserRole.EMPLOYEE as string,
    permissions: [] as string[],
    projectAccess: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MODULES = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'clients', label: 'Clients' },
    { id: 'projects', label: 'Projects' },
    { id: 'explorer', label: 'Explorer' },
    { id: 'notes', label: 'Notes' },
    { id: 'documents', label: 'Documents' },
    { id: 'vault', label: 'Vault' },
    { id: 'chat', label: 'Chat' },
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(data, ['displayName', 'email']);

  const handleOpenModal = (member?: UserProfile) => {
    if (member) {
      setEditingMember(member);
      setFormData({ 
        displayName: member.displayName, 
        email: member.email, 
        password: '',
        role: member.role,
        permissions: member.permissions || [],
        projectAccess: member.projectAccess || []
      });
    } else {
      setEditingMember(null);
      setFormData({ 
        displayName: '', 
        email: '', 
        password: '',
        role: UserRole.EMPLOYEE,
        permissions: ['dashboard', 'chat'],
        projectAccess: []
      });
    }
    setIsModalOpen(true);
  };

  const togglePermission = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(moduleId)
        ? prev.permissions.filter(id => id !== moduleId)
        : [...prev.permissions, moduleId]
    }));
  };

  const toggleProjectAccess = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      projectAccess: prev.projectAccess.includes(projectId)
        ? prev.projectAccess.filter(id => id !== projectId)
        : [...prev.projectAccess, projectId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let secondaryApp = null;
    try {
      if (editingMember) {
        const userRef = doc(db, 'users', editingMember.uid);
        await updateDoc(userRef, {
          displayName: formData.displayName,
          role: formData.role,
          permissions: formData.permissions,
          projectAccess: formData.projectAccess
        });
      } else {
        if (!formData.password || formData.password.length < 6) {
          alert('Password must be at least 6 characters long.');
          setIsSubmitting(false);
          return;
        }

        // Create Auth Account using a temporary secondary app instance
        // This avoids signing out the current admin
        const secondaryAppName = `secondary-app-${Date.now()}`;
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        
        const { user: newUser } = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        const uid = newUser.uid;
        
        // Sign out from the secondary instance
        await signOutAuth(secondaryAuth);
        await deleteApp(secondaryApp);
        secondaryApp = null;

        // Create Firestore profile
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
          uid: uid,
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          permissions: formData.permissions,
          projectAccess: formData.projectAccess,
          status: 'active',
          avatarUrl: null,
          createdAt: new Date().getTime()
        });
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error creating/updating user:', error);
      if (secondaryApp) await deleteApp(secondaryApp);
      
      const message = error?.message || 'Action failed.';
      alert(`Error: ${message}`);
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingMember?.uid || 'new'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (uid: string) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'active'
      });
      alert('User has been re-activated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      alert('Failed to activate user. Check console for details.');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!uid) return;
    if (confirm('Are you sure you want to disable this user? They will be signed out and unable to access the system.')) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          status: 'disabled'
        });
        alert('User has been disabled successfully.');
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
        alert('Failed to disable user. Check console for details.');
      }
    }
  };

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const columns = [
    {
      header: 'Member',
      key: 'displayName',
      render: (member: UserProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            ) : (
              (member.displayName || member.email || '?').charAt(0)
            )}
          </div>
          <div>
            <div className="font-medium text-slate-900">{member.displayName}</div>
            <div className="text-xs text-slate-400">{member.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (member: UserProfile) => (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg w-fit">
          {member.role === UserRole.ADMIN ? (
            <ShieldCheck size={12} className="text-blue-600" />
          ) : member.role === UserRole.MANAGER ? (
            <ShieldCheck size={12} className="text-emerald-600" />
          ) : (
            <Shield size={12} className="text-slate-400" />
          )}
          <span className="text-[10px] font-bold uppercase text-slate-700 tracking-wider">
            {member.role}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (member: UserProfile) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            member.status === 'disabled' ? "bg-rose-500" : "bg-emerald-500"
          )} />
          <span className="text-xs text-slate-600 capitalize">{member.status || 'active'}</span>
        </div>
      ),
    },
    {
      header: 'Joined',
      key: 'createdAt',
      render: (member: any) => (
        <span className="text-xs text-slate-500">
          {member.createdAt?.seconds ? new Date(member.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
        </span>
      )
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (member: UserProfile) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent">
            <Mail size={16} />
          </button>
          {(isAdmin || currentUser?.uid === member.uid) && (
            <ActionMenu 
              items={[
                { label: 'Send Email', onClick: () => {
                  setEmailRecipient({ email: member.email, name: member.displayName || member.email });
                  setIsEmailModalOpen(true);
                }, icon: Mail },
                { label: 'Edit Member', onClick: () => handleOpenModal(member), icon: Edit },
                ...(isAdmin && currentUser?.uid !== member.uid ? [
                  member.status === 'disabled' 
                    ? { label: 'Re-activate', onClick: () => handleActivate(member.uid), icon: ShieldCheck }
                    : { label: 'Disable Member', onClick: () => handleDelete(member.uid), variant: 'danger' as const, icon: Trash2 }
                ] : []),
              ]}
            />
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-slate-500 text-sm">Loading team members...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Team Members</h2>
          <p className="text-slate-500 text-sm">Manage roles and permissions for your organization.</p>
        </div>
        {isAdmin ? (
          <button 
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
            onClick={() => handleOpenModal()}
          >
            <Plus size={18} />
            Create User Profile
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            Contact an admin to invite new members or change roles.
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search team members..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredData}
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? 'Edit Member Details' : 'Create User Profile'}
        size="xl"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button 
              form="user-form"
              disabled={isSubmitting} 
              onClick={handleSubmit} 
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {editingMember ? 'Save Changes' : 'Create Account'}
            </button>
          </>
        }
      >
        <form className="space-y-6" id="user-form" onSubmit={handleSubmit}>
          {!editingMember && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700 mb-2">
              <strong>Note:</strong> This will create both a login account and a user profile. The user can log in immediately with the email and password provided.
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Full Name" 
              value={formData.displayName} 
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} 
              placeholder="e.g. Alice Smith"
              required
              disabled={!isAdmin && currentUser?.uid !== editingMember?.uid}
            />
            <Input 
              label="Email Address" 
              type="email"
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
              placeholder="e.g. alice@nexus.com"
              required
              disabled={editingMember !== null}
            />
          </div>

          {!editingMember && (
            <Input 
              label="Password" 
              type="password"
              value={formData.password} 
              onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
              placeholder="Min 6 characters"
              required
            />
          )}

          {isAdmin && (
            <div className="space-y-6">
              <div className="max-w-xs">
                <Select 
                  label="Access Role" 
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  options={[
                    { label: 'Employee', value: UserRole.EMPLOYEE },
                    { label: 'Manager', value: UserRole.MANAGER },
                    { label: 'Admin', value: UserRole.ADMIN },
                  ]}
                />
              </div>
              
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Module Permissions</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  {MODULES.map((module) => (
                    <label key={module.id} className="flex items-center gap-2 cursor-pointer group hover:bg-white p-1 rounded-lg transition-colors">
                      <input 
                        type="checkbox"
                        checked={formData.permissions.includes(module.id)}
                        onChange={() => togglePermission(module.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                      />
                      <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-tight">{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Project Access</label>
                <div className="p-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
                    {PROJECTS_DATA.map((project) => (
                      <label key={project.id} className="flex items-center justify-between cursor-pointer group hover:bg-white p-2.5 rounded-lg transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={formData.projectAccess.includes(project.id)}
                            onChange={() => toggleProjectAccess(project.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                          />
                          <span className="text-xs text-slate-700 group-hover:text-slate-900 transition-colors font-bold uppercase tracking-tight">{project.title}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-500 uppercase tracking-widest">{project.client}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic font-medium px-1">Managers and Employees will only see data related to these specific projects.</p>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {emailRecipient && (
        <EmailModal 
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipientEmail={emailRecipient.email}
          recipientName={emailRecipient.name}
          type="team"
        />
      )}
    </div>
  );
}

