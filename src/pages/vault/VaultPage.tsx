import { useState, useMemo } from 'react';
import { VAULT_DATA } from '../../dummy-data/tools';
import { useAuth } from '../../store/AuthContext';
import { useSearch } from '../../hooks/useSearch';
import { Lock, Eye, EyeOff, Copy, Search, Plus, ShieldCheck, Trash2, Upload, Terminal, Globe, Sliders } from 'lucide-react';
import { ActionMenu } from '../../components/common/ActionMenu';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { cn } from '../../utils/cn';

type EnvType = 'production' | 'staging' | 'development';

export default function VaultPage({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const accessibleVault = useMemo(() => {
    if (isAdmin) return VAULT_DATA;
    return VAULT_DATA.filter(v => user?.projectAccess?.includes(v.projectId));
  }, [user, isAdmin]);

  const [data, setData] = useState(accessibleVault);
  
  useMemo(() => {
    setData(accessibleVault);
  }, [accessibleVault]);
  const [activeEnv, setActiveEnv] = useState<EnvType>('production');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [envRawText, setEnvRawText] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({ key: '', value: '', type: 'secret' });

  const filteredVaultByProject = useMemo(() => {
    if (!projectId) return data;
    return data.filter(v => v.projectId === projectId);
  }, [data, projectId]);

  const envFilteredData = useMemo(() => {
    return filteredVaultByProject.filter(item => item.env === activeEnv);
  }, [filteredVaultByProject, activeEnv]);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(envFilteredData, ['key', 'value']);

  const toggleValue = (id: string) => {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app we'd use a toast component
  };

  const handleAddVariable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newVar = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: projectId || '1',
      ...formData,
      env: activeEnv,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setData([newVar, ...data]);
    setIsAddModalOpen(false);
    setFormData({ key: '', value: '', type: 'secret' });
  };

  const handleImportEnv = () => {
    const lines = envRawText.split('\n');
    const newVars: any[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      
      if (key) {
        newVars.push({
          id: Math.random().toString(36).substr(2, 9),
          key: key.trim(),
          value: value.trim(),
          env: activeEnv,
          type: key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD') ? 'secret' : 'public',
          updatedAt: new Date().toISOString().split('T')[0]
        });
      }
    });

    setData([...data, ...newVars]);
    setIsImportModalOpen(false);
    setEnvRawText('');
  };

  const columns = [
    {
      header: 'Variable Key',
      key: 'key',
      render: (item: any) => (
        <div className="flex items-center gap-2">
           <div className={cn(
             "w-2 h-2 rounded-full",
             item.type === 'secret' ? "bg-amber-400" : "bg-blue-400"
           )} />
           <code className="text-xs font-bold text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{item.key}</code>
        </div>
      ),
    },
    {
      header: 'Value',
      key: 'value',
      render: (item: any) => (
        <div className="flex items-center gap-2 group/val">
          <code className="text-xs text-slate-600 font-mono">
            {showValues[item.id] ? item.value : '••••••••••••••••'}
          </code>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/val:opacity-100 transition-opacity">
            <button onClick={() => toggleValue(item.id)} className="p-1 hover:text-blue-600 text-slate-400">
              {showValues[item.id] ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
            <button onClick={() => copyToClipboard(item.value)} className="p-1 hover:text-blue-600 text-slate-400">
              <Copy size={12} />
            </button>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (item: any) => (
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
          item.type === 'secret' ? "text-amber-600 bg-amber-50 border-amber-100" : "text-blue-600 bg-blue-50 border-blue-100"
        )}>
          {item.type}
        </span>
      )
    },
    {
      header: 'Last Updated',
      key: 'updatedAt',
      className: 'text-[10px] text-slate-400 font-medium'
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (item: any) => (
        <ActionMenu 
          items={[
            { label: 'Edit Variable', onClick: () => console.log('Edit', item.id) },
            { label: 'Rotate Secret', onClick: () => console.log('Rotate', item.id), icon: ShieldCheck },
            { label: 'Delete', onClick: () => setData(data.filter(i => i.id !== item.id)), variant: 'danger', icon: Trash2 },
          ]}
        />
      ),
    },
  ];

  const envs: { id: EnvType, label: string, icon: any }[] = [
    { id: 'production', label: 'Production', icon: Globe },
    { id: 'staging', label: 'Staging', icon: Sliders },
    { id: 'development', label: 'Development', icon: Terminal },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <ShieldCheck size={20} className="text-blue-600" />
             <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Safe Vault</h2>
          </div>
          <p className="text-slate-500 text-sm text-left">Shared environment secrets and configuration variables.</p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsImportModalOpen(true)}
             className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
           >
             <Upload size={18} />
             Import .env
           </button>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-lg hover:shadow-blue-500/10 transition-all active:scale-95"
           >
             <Plus size={18} />
             Add Variable
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {envs.map((env) => (
          <button
            key={env.id}
            onClick={() => setActiveEnv(env.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              activeEnv === env.id 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
            )}
          >
            <env.icon size={16} />
            {env.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/20">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeEnv} variables...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {filteredData.length} Variables Found
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredData}
        />
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Import .env to ${activeEnv}`}
        footer={
          <>
            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleImportEnv} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg">Parse & Import</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Paste your <code className="bg-slate-100 px-1 rounded">.env</code> file content below. Values will be parsed and added to the <span className="font-bold text-slate-900 capitalize">{activeEnv}</span> environment.</p>
          <textarea 
            value={envRawText}
            onChange={(e) => setEnvRawText(e.target.value)}
            placeholder="DB_HOST=localhost&#10;DB_USER=root&#10;..."
            rows={10}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
          />
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
             <Lock size={16} className="text-amber-500 mt-0.5 shrink-0" />
             <div className="text-[11px] text-amber-700 leading-relaxed">
                By default, keys containing <code className="bg-amber-100 px-1 rounded">SECRET</code>, <code className="bg-amber-100 px-1 rounded">KEY</code>, or <code className="bg-amber-100 px-1 rounded">PASSWORD</code> will be marked as secrets and masked.
             </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Environment Variable"
        footer={
          <>
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleAddVariable} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg">Add Variable</button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleAddVariable}>
          <Input 
            label="Variable Key" 
            value={formData.key} 
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
            placeholder="e.g. API_KEY"
            required
          />
          <Input 
            label="Value" 
            value={formData.value} 
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder="Variable value..."
            required
          />
          <Select 
            label="Type" 
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            options={[
              { label: 'Secret (Masked)', value: 'secret' },
              { label: 'Public (Plain text)', value: 'public' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
