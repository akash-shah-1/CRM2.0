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
  const [passwordPromptId, setPasswordPromptId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [unlockedItems, setUnlockedItems] = useState<Record<string, number>>({});

  const toggleValue = (id: string, isSecret: boolean) => {
    if (isSecret && !unlockedItems[id]) {
      setPasswordPromptId(id);
      setAdminPassword('');
      setPasswordError('');
      return;
    }
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const verifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') { // Simple simulation, in real app check against hash
      if (passwordPromptId) {
        setUnlockedItems(prev => ({ ...prev, [passwordPromptId]: Date.now() + 60000 }));
        setShowValues(prev => ({ ...prev, [passwordPromptId]: true }));
        
        // Auto-lock after 60 seconds
        setTimeout(() => {
          setUnlockedItems(prev => {
            const next = { ...prev };
            delete next[passwordPromptId];
            return next;
          });
          setShowValues(prev => ({ ...prev, [passwordPromptId]: false }));
        }, 60000);
      }
      setPasswordPromptId(null);
    } else {
      setPasswordError('Invalid password. Please try again.');
    }
  };

  const filteredVaultByProject = useMemo(() => {
    if (!projectId) return data;
    return data.filter(v => v.projectId === projectId);
  }, [data, projectId]);

  const envFilteredData = useMemo(() => {
    return filteredVaultByProject.filter(item => item.env === activeEnv);
  }, [filteredVaultByProject, activeEnv]);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(envFilteredData, ['key', 'value']);

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
             item.type === 'secret' ? "bg-warning" : "bg-primary"
           )} />
           <code className="text-[12px] font-bold text-text-primary bg-bg-light px-1.5 py-0.5 rounded border border-border font-mono">{item.key}</code>
        </div>
      ),
    },
    {
      header: 'Value',
      key: 'value',
      render: (item: any) => (
        <div className="flex items-center gap-2 group/val">
          <code className={cn(
            "text-[12px] font-mono bg-bg-light/50 px-2 py-0.5 rounded border border-border/50 transition-all",
            showValues[item.id] ? "text-primary" : "text-text-secondary"
          )}>
            {showValues[item.id] ? item.value : '••••••••••••••••'}
          </code>
          <div className="flex items-center gap-0.5 opacity-0 group-hover/val:opacity-100 transition-opacity">
            <button onClick={() => toggleValue(item.id, item.type === 'secret')} className="p-1 hover:text-primary text-text-secondary transition-colors">
              {showValues[item.id] ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button 
              onClick={() => {
                if (item.type === 'secret' && !unlockedItems[item.id]) {
                  toggleValue(item.id, true);
                } else {
                  copyToClipboard(item.value);
                }
              }} 
              className="p-1 hover:text-primary text-text-secondary transition-colors"
            >
              <Copy size={14} />
            </button>
          </div>
          {unlockedItems[item.id] && (
            <span className="text-[9px] font-bold text-warning animate-pulse">Visible for {Math.max(0, Math.ceil((unlockedItems[item.id] - Date.now()) / 1000))}s</span>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'type',
      render: (item: any) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
          item.type === 'secret' ? "bg-warning/10 text-warning border-warning/20" : "bg-primary/10 text-primary border-primary/20"
        )}>
          {item.type}
        </span>
      )
    },
    {
      header: 'Last Updated',
      key: 'updatedAt',
      render: (item: any) => (
        <span className="text-[11px] font-medium text-text-secondary">{item.updatedAt}</span>
      )
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Safe Vault</h2>
          <p className="text-text-secondary text-[13px]">Shared environment secrets and configuration variables.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsImportModalOpen(true)}
             className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text-secondary rounded hover:bg-bg-light transition-all text-[13px] font-bold"
           >
             <Upload size={16} />
             Import .env
           </button>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm shadow-primary/20 active:scale-95"
           >
             <Plus size={16} />
             Add Variable
           </button>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-border">
        {envs.map((env) => (
          <button
            key={env.id}
            onClick={() => setActiveEnv(env.id)}
            className={cn(
              "flex items-center gap-2 px-1 py-3 text-[13px] font-bold transition-all border-b-2 relative -mb-[1px]",
              activeEnv === env.id 
                ? "border-primary text-primary" 
                : "border-transparent text-text-secondary hover:text-text-primary"
            )}
          >
            <env.icon size={14} />
            {env.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="p-4 bg-white flex items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeEnv} variables...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-widest hidden sm:block">
            {filteredData.length} Variables Identified
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredData}
          showCheckboxes={true}
        />
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={`Import .env to ${activeEnv}`}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded">Cancel</button>
            <button onClick={handleImportEnv} className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded shadow-sm shadow-primary/20 transition-all">Parse & Import</button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-text-secondary font-medium">Paste your <code className="bg-bg-light px-1 rounded text-primary">.env</code> file content below. Values will be parsed and assigned to the <span className="font-bold text-text-primary capitalize underline decoration-primary/30 underline-offset-2">{activeEnv}</span> scope.</p>
          <textarea 
            value={envRawText}
            onChange={(e) => setEnvRawText(e.target.value)}
            placeholder="DB_HOST=localhost&#10;DB_USER=root&#10;..."
            rows={10}
            className="w-full px-4 py-3 bg-bg-light/30 border border-border rounded text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <div className="p-3 bg-warning/5 border border-warning/20 rounded flex items-start gap-3">
             <Lock size={16} className="text-warning mt-0.5 shrink-0" />
             <div className="text-[11px] text-text-secondary font-medium leading-relaxed">
                <span className="font-bold text-warning">Security Note:</span> Keys containing <code className="bg-white/50 px-1 rounded">SECRET</code>, <code className="bg-white/50 px-1 rounded">KEY</code>, or <code className="bg-white/50 px-1 rounded">PASSWORD</code> are automatically flagged for masking.
             </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Environment Variable"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded-md">Cancel</button>
            <button onClick={handleAddVariable} className="px-5 py-2 text-[13px] font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm shadow-primary/20 transition-all">Add Variable</button>
          </div>
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

      <Modal
        isOpen={!!passwordPromptId}
        onClose={() => setPasswordPromptId(null)}
        title="Identity Verification Required"
        size="sm"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button onClick={() => setPasswordPromptId(null)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded-md transition-all">Cancel</button>
            <button onClick={verifyPassword} className="px-5 py-2 text-[13px] font-bold text-white bg-warning hover:bg-warning-hover rounded-md shadow-sm shadow-warning/20 transition-all active:scale-95">Access Credentials</button>
          </div>
        }
      >
        <form onSubmit={verifyPassword} className="space-y-4">
          <div className="flex flex-col items-center gap-4 text-center mb-4">
             <div className="w-14 h-14 bg-warning/10 text-warning rounded-full flex items-center justify-center border border-warning/20">
                <Lock size={28} />
             </div>
             <div>
                <h4 className="font-bold text-text-primary">Unlock Protected Data</h4>
                <p className="text-[12px] text-text-secondary mt-1">Please enter your administrative password. Access will be granted for 60 seconds.</p>
             </div>
          </div>
          <Input 
            label="Admin Password" 
            type="password" 
            placeholder="Enter password..."
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            error={passwordError}
            autoFocus
          />
          {passwordError && <p className="text-[11px] text-danger font-medium mt-1">{passwordError}</p>}
        </form>
      </Modal>
    </div>
  );
}
