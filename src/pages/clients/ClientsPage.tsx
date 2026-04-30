import { useState, useEffect, useMemo } from 'react';
import { CLIENTS_DATA } from '../../dummy-data/clients';
import { PROJECTS_DATA } from '../../dummy-data/projects';
import { useAuth } from '../../store/AuthContext';
import { Search, Plus, Mail, Phone, Edit, Trash2, Filter } from 'lucide-react';
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
        <div>
          <div className="font-medium text-slate-900">{client.name}</div>
          <div className="text-xs text-slate-400">{client.email}</div>
        </div>
      ),
    },
    {
      header: 'Company',
      key: 'company',
      className: 'text-sm text-slate-600',
    },
    {
      header: 'Status',
      key: 'status',
      render: (client: any) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          client.status === 'active' ? 'bg-green-50 text-green-600' :
          client.status === 'lead' ? 'bg-blue-50 text-blue-600' :
          'bg-slate-50 text-slate-500'
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
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" 
            title="Email"
            onClick={() => {
              setEmailRecipient({ email: client.email, name: client.name });
              setIsEmailModalOpen(true);
            }}
           >
             <Mail size={14} />
           </button>
           <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Call">
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
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Clients</h2>
            <p className="text-slate-500 text-sm text-left">Manage your enterprise client relationships.</p>
          </div>
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm transition-all active:scale-95"
            onClick={() => handleOpenModal()}
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search clients..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg text-sm px-3 py-2 focus:outline-none text-slate-600 shadow-sm"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Lead</option>
              <option>Inactive</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1">
                         <Skeleton className="h-4 w-40" />
                         <Skeleton className="h-2 w-20" />
                      </div>
                   </div>
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-4 w-32" />
                   <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <DataTable 
                columns={columns}
                data={filteredData}
              />

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="text-xs text-slate-500">Showing {filteredData.length} clients</div>
                <div className="flex items-center gap-2">
                    <button disabled className="px-3 py-1 text-xs font-medium text-slate-300 border border-slate-100 rounded bg-white">Prev</button>
                    <button className="px-3 py-1 text-xs font-medium text-slate-600 border border-slate-100 rounded hover:bg-slate-50 bg-white">Next</button>
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
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors">
              {editingClient ? 'Save Changes' : 'Create Client'}
            </button>
          </>
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
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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

