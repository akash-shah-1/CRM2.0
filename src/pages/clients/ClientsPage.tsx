import { useState, useEffect, useMemo } from 'react';
import { CLIENTS_DATA } from '../../dummy-data/clients';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { Search, Plus, Mail, Phone, Edit, Trash2, Filter, Briefcase } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { EmailModal } from '../../components/common/EmailModal';
import { Input, Select } from '../../components/ui/FormElements';
import { logActivity } from '../../utils/activity';
import { createNotification } from '../../utils/notifications';
import { subscribeToClients, createClient, updateClient, ClientData } from '../../services/clientService';
import { PageTransition } from '../../components/common/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';
import { ClientProjectWizard } from '../../components/clients/ClientProjectWizard';

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [dbData, setDbData] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToClients((data) => {
      setDbData(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const accessibleClients = useMemo(() => {
    // Merge dummy data for initial feel
    const combined = [...dbData, ...CLIENTS_DATA];
    
    if (isAdmin) return combined;
    
    // Get accessible projects
    const userProjects = PROJECTS_DATA.filter(p => user?.projectAccess?.includes(p.id));
    const clientNames = new Set(userProjects.map(p => p.client));
    
    return combined.filter(c => clientNames.has(c.name));
  }, [user, isAdmin, dbData]);

  const [data, setData] = useState(accessibleClients);

  useEffect(() => {
    setData(accessibleClients);
  }, [accessibleClients]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState<{ email: string, name: string } | null>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', company: '', email: '', status: 'lead' as 'active' | 'lead' | 'inactive', phone: '' });

  const [statusFilter, setStatusFilter] = useState('All Status');
  const { searchTerm, setSearchTerm, filteredData: searchedData } = useSearch(data, ['name', 'company', 'email']);

  const filteredData = useMemo(() => {
    if (statusFilter === 'All Status') return searchedData;
    return searchedData.filter(c => c.status.toLowerCase() === statusFilter.toLowerCase());
  }, [searchedData, statusFilter]);

  const handleOpenModal = (client?: any) => {
    if (client) {
      setEditingClient(client);
      setFormData({ 
        name: client.name, 
        company: client.company, 
        email: client.email, 
        status: client.status as 'active' | 'lead' | 'inactive', 
        phone: client.phone || '' 
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', company: '', email: '', status: 'lead', phone: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      if (editingClient.id.length > 10) { // Firestore ID
        await updateClient(editingClient.id, formData);
      }
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'updated client information',
        target: formData.name,
        type: 'client'
      });
    } else {
      await createClient(formData);

      await createNotification({
        title: 'New Client Partnership',
        message: `${formData.name} from ${formData.company} has been added to the CRM.`,
        type: 'info',
        userId: 'admin'
      });

      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'onboarded new client',
        target: formData.name,
        type: 'client'
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const client = data.find(c => c.id === id);
    if (confirm('Are you sure you want to delete this client?')) {
      setData(data.filter(c => c.id !== id));
      
      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'removed client',
        target: client?.name || 'Unknown',
        type: 'client'
      });
    }
  };

  const columns = [
    {
      header: 'Client Name',
      key: 'name',
      render: (client: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {client.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-text-primary">{client.name}</div>
            <div className="text-[11px] text-text-secondary">{client.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Company',
      key: 'company',
      className: 'text-[13px] font-medium text-text-secondary',
    },
    {
      header: 'Location',
      key: 'location',
      render: (client: any) => (
        <div className="text-[12px] text-text-secondary flex items-center gap-1.5 font-medium">
          <Filter size={10} className="rotate-90 opacity-40" />
          {client.location || 'Not Set'}
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (client: any) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
          client.status === 'active' ? 'bg-success/10 text-success border-success/20' :
          client.status === 'lead' ? 'bg-primary/10 text-primary border-primary/20' :
          'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {client.status}
        </span>
      ),
    },
    {
      header: 'Contact',
      key: 'contact',
      render: (client: any) => (
        <div className="flex items-center gap-2">
           <button 
            className="w-7 h-7 flex items-center justify-center text-primary/70 hover:text-primary hover:bg-primary/5 rounded-md transition-all" 
            title="Email"
            onClick={() => {
              setEmailRecipient({ email: client.email, name: client.name });
              setIsEmailModalOpen(true);
            }}
           >
             <Mail size={14} />
           </button>
           <button className="w-7 h-7 flex items-center justify-center text-success/70 hover:text-success hover:bg-success/5 rounded-md transition-all" title="Call">
             <Phone size={14} />
           </button>
        </div>
      ),
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (client: any) => (
        <ActionMenu 
          items={[
            { label: 'Send Email', onClick: () => {
              setEmailRecipient({ email: client.email, name: client.name });
              setIsEmailModalOpen(true);
            }, icon: Mail },
            { label: 'Edit Client', onClick: () => handleOpenModal(client), icon: Edit },
            { label: 'Delete Client', onClick: () => handleDelete(client.id), variant: 'danger', icon: Trash2 },
          ]}
        />
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="hidden sm:block">
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Active Clients</h2>
            <p className="text-text-secondary text-[13px]">Track and manage your enterprise client database.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-white text-text-primary rounded-md hover:bg-bg-light transition-all text-[13px] font-bold shadow-sm active:scale-95"
              onClick={() => handleOpenModal()}
            >
              <Plus size={16} />
              Quick Client
            </button>
            <button 
              className="inline-flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
              onClick={() => setIsWizardOpen(true)}
            >
              <Briefcase size={16} />
              New Client & Project
            </button>
          </div>
        </div>

        <ClientProjectWizard 
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
        />

        <div className="bg-white rounded-md border border-border shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row items-center gap-4 bg-white">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search by name, company, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-40">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-bg-light border border-border rounded-md text-[13px] focus:outline-none focus:border-primary transition-all text-text-secondary appearance-none outline-none"
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Lead</option>
                  <option>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-bg-light" />
                      <div className="space-y-2">
                         <div className="h-3 bg-bg-light rounded-md w-32" />
                         <div className="h-2 bg-bg-light rounded-md w-20" />
                      </div>
                   </div>
                   <div className="h-3 bg-bg-light rounded-md w-24" />
                   <div className="h-6 bg-bg-light rounded-md w-20" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <DataTable 
                columns={columns}
                data={filteredData}
                showCheckboxes={true}
              />

              <div className="p-4 px-6 border-t border-border flex items-center justify-between bg-white">
                <div className="text-[13px] text-text-secondary">Showing <span className="font-bold text-text-primary">{filteredData.length}</span> of <span className="font-bold text-text-primary">{accessibleClients.length}</span> results</div>
                <div className="flex items-center gap-2">
                    <button disabled className="px-3 py-1.5 text-[12px] font-bold text-slate-300 border border-border rounded-md opacity-50">Previous</button>
                    <div className="flex items-center">
                       <button className="w-8 h-8 flex items-center justify-center bg-primary text-white text-[12px] font-bold rounded-md shadow-sm">1</button>
                    </div>
                    <button className="px-3 py-1.5 text-[12px] font-bold text-text-primary border border-border rounded-md hover:bg-bg-light transition-all">Next</button>
                </div>
              </div>
            </>
          )}
        </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded-md transition-all">Cancel</button>
            <button onClick={handleSubmit} className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm shadow-primary/20 transition-all active:scale-95">
              {editingClient ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input 
            label="Full Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            placeholder="e.g. John Doe"
            required
          />
          <Input 
            label="Company" 
            value={formData.company} 
            onChange={(e) => setFormData({ ...formData, company: e.target.value })} 
            placeholder="e.g. Acme Industries"
            required
          />
          <Input 
            label="Email Address" 
            type="email"
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            placeholder="e.g. john@acme.com"
            required
          />
          <Select 
            label="Status" 
            value={formData.status} 
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'lead' | 'inactive' })}
            options={[
              { label: 'Lead', value: 'lead' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ]}
          />
        </form>
      </Modal>

      {emailRecipient && (
        <EmailModal 
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          recipientEmail={emailRecipient.email}
          recipientName={emailRecipient.name}
          type="client"
        />
      )}
      </div>
    </PageTransition>
  );
}

