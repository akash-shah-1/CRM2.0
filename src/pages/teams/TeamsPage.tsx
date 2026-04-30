import { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as signOutAuth } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../../services/firebase';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrorHandler';
import { useAuth } from '../../store/AuthContext';
import { cn } from '../../utils/cn';
import { Shield, ShieldCheck, Mail, Edit, Trash2, Search, Plus, Loader2, Filter } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { EmailModal } from '../../components/common/EmailModal';
import { Input, Select } from '../../components/ui/FormElements';
import { UserRole, UserProfile } from '../../types/auth';
import { logActivity } from '../../utils/activity';
import { createNotification } from '../../utils/notifications';
import { PageTransition } from '../../components/common/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';

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

        await createNotification({
          title: 'Organization Expansion',
          message: `${formData.displayName} has been onboarded to the platform as ${formData.role}.`,
          type: 'success',
          userId: 'admin'
        });

        logActivity({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.displayName || 'Admin',
          action: 'created new user profile',
          target: formData.displayName || formData.email,
          type: 'team'
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
      const member = data.find(m => m.uid === uid);
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'active'
      });

      logActivity({
        userId: currentUser?.uid || 'unknown',
        userName: currentUser?.displayName || 'Admin',
        action: 're-activated user profile',
        target: member?.displayName || member?.email || 'Unknown',
        type: 'team'
      });

      alert('User has been re-activated successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      alert('Failed to activate user. Check console for details.');
    }
  };

  const handleDelete = async (uid: string) => {
    if (!uid) return;
    const member = data.find(m => m.uid === uid);
    if (confirm('Are you sure you want to disable this user? They will be signed out and unable to access the system.')) {
      try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          status: 'disabled'
        });

        logActivity({
          userId: currentUser?.uid || 'unknown',
          userName: currentUser?.displayName || 'Admin',
          action: 'de-activated user profile',
          target: member?.displayName || member?.email || 'Unknown',
          type: 'team'
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
          <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
            ) : (
              (member.displayName || member.email || '?').charAt(0)
            )}
          </div>
          <div>
            <div className="font-semibold text-text-primary text-[13.5px]">{member.displayName}</div>
            <div className="text-[11px] text-text-secondary">{member.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (member: UserProfile) => (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
          member.role === UserRole.ADMIN ? "bg-primary/10 text-primary border-primary/20" :
          member.role === UserRole.MANAGER ? "bg-success/10 text-success border-success/20" :
          "bg-bg-light text-text-secondary border-border"
        )}>
          {member.role}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (member: UserProfile) => (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
          member.status === 'disabled' ? "bg-danger/10 text-danger border-danger/20" : "bg-success/10 text-success border-success/20"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", member.status === 'disabled' ? "bg-danger" : "bg-success")} />
          {member.status || 'active'}
        </span>
      ),
    },
    {
      header: 'Joined',
      key: 'createdAt',
      render: (member: any) => (
        <span className="text-[12px] font-medium text-text-secondary">
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
          <button 
            onClick={() => {
              setEmailRecipient({ email: member.email, name: member.displayName || member.email });
              setIsEmailModalOpen(true);
            }}
            className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-all"
          >
            <Mail size={16} />
          </button>
          {(isAdmin || currentUser?.uid === member.uid) && (
            <ActionMenu 
              items={[
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

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Team Management</h2>
            <p className="text-text-secondary text-[13px]">Manage roles and system permissions for your organization.</p>
          </div>
          {isAdmin ? (
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
              onClick={() => handleOpenModal()}
            >
              <Plus size={16} />
              + Add Member
            </button>
          ) : (
            <div className="bg-warning/10 border border-warning/20 text-warning px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider">
              Admin Access Required
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-4 bg-white">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-bg-light" />
                      <div className="space-y-2">
                         <div className="h-3 bg-bg-light rounded w-40" />
                         <div className="h-2 bg-bg-light rounded w-20" />
                      </div>
                   </div>
                   <div className="h-4 bg-bg-light rounded w-20" />
                   <div className="h-4 bg-bg-light rounded w-24" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable 
              columns={columns}
              data={filteredData}
              showCheckboxes={true}
            />
          )}
        </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMember ? 'Edit Member' : 'Add Team Member'}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded transition-all">Cancel</button>
            <button 
              form="user-form"
              disabled={isSubmitting} 
              onClick={handleSubmit} 
              className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded shadow-sm shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {editingMember ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        }
      >
        <form className="space-y-6" id="user-form" onSubmit={handleSubmit}>
          {!editingMember && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded text-[12px] text-primary">
              <span className="font-bold">Account Setup:</span> This creates both a directory profile and authentication credentials.
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
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-[0.05em]">Module Permissions</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-bg-light/50 border border-border rounded-lg">
                  {MODULES.map((module) => (
                    <label key={module.id} className="flex items-center gap-2 cursor-pointer group p-1.5 rounded transition-all">
                      <input 
                        type="checkbox"
                        checked={formData.permissions.includes(module.id)}
                        onChange={() => togglePermission(module.id)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <span className="text-[12px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">{module.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-[0.05em]">Project Scoping</label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-1 gap-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {PROJECTS_DATA.map((project) => (
                      <label key={project.id} className="flex items-center justify-between cursor-pointer group hover:bg-bg-light/50 p-2.5 px-4 transition-all">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={formData.projectAccess.includes(project.id)}
                            onChange={() => toggleProjectAccess(project.id)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                          />
                          <span className="text-[12px] font-semibold text-text-primary">{project.title}</span>
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{project.client}</span>
                      </label>
                    ))}
                  </div>
                </div>
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
    </PageTransition>
  );
}

