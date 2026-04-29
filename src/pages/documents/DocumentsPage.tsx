import { useState, useMemo } from 'react';
import { DOCUMENTS_DATA } from '../../dummy-data/tools';
import { useAuth } from '../../store/AuthContext';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { File, Download, Search, Plus, Filter, FileText, FileImage, FileArchive, Trash2, Edit } from 'lucide-react';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';

export default function DocumentsPage({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const accessibleDocs = useMemo(() => {
    if (isAdmin) return DOCUMENTS_DATA;
    return DOCUMENTS_DATA.filter(d => user?.projectAccess?.includes(d.projectId));
  }, [user, isAdmin]);

  const [data, setData] = useState(accessibleDocs);
  
  useMemo(() => {
    setData(accessibleDocs);
  }, [accessibleDocs]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'PDF', projectId: projectId || '1' });
  
  const filteredDocsByProject = useMemo(() => {
    if (!projectId) return data;
    return data.filter(d => d.projectId === projectId);
  }, [data, projectId]);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(filteredDocsByProject, ['name', 'projectId', 'type']);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type,
      size: '0 KB',
      projectId: formData.projectId,
      uploadedBy: 'Current User'
    };
    setData([newDoc, ...data]);
    setIsModalOpen(false);
    setFormData({ name: '', type: 'PDF', projectId: projectId || '1' });
  };

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF': return <FileText className="text-red-500" size={18} />;
      case 'FIGMA': return <FileImage className="text-purple-500" size={18} />;
      case 'DOCX': return <File className="text-blue-500" size={18} />;
      default: return <FileArchive className="text-slate-400" size={18} />;
    }
  };

  const columns = [
    {
      header: 'Document Name',
      key: 'name',
      render: (doc: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm">
            {getFileIcon(doc.type)}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">{doc.name}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.type} • {doc.size}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Project / Association',
      key: 'projectId',
      className: 'text-sm font-medium text-slate-600',
    },
    {
      header: 'Uploaded By',
      key: 'uploadedBy',
      render: (doc: any) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
            {doc.uploadedBy?.charAt(0) || '?'}
          </div>
          <span className="text-xs text-slate-600 font-medium">{doc.uploadedBy || 'Unknown User'}</span>
        </div>
      ),
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (doc: any) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent">
            <Download size={16} />
          </button>
          <ActionMenu 
            items={[
              { label: 'Rename', onClick: () => console.log('Rename', doc.id) },
              { label: 'Share Link', onClick: () => console.log('Share', doc.id) },
              { label: 'Delete', onClick: () => setData(data.filter(d => d.id !== doc.id)), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Document Center</h2>
          <p className="text-slate-500 text-sm text-left">Centralized repository for project assets and contracts.</p>
        </div>
        <button 
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm transition-all active:scale-95"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={18} />
          Upload File
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search documents by name or project..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-widest">
              <Filter size={14} />
              Filter
            </button>
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
        title="Upload New Document"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleUpload} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg">Upload</button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleUpload}>
          <Input 
            label="File Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Project_Plan.pdf"
            required
          />
          <Select 
            label="File Type" 
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { label: 'PDF Document', value: 'PDF' },
              { label: 'Figma Design', value: 'FIGMA' },
              { label: 'Word Document', value: 'DOCX' },
              { label: 'Archive/ZIP', value: 'ZIP' },
            ]}
          />
        </form>
      </Modal>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {[
          { label: 'PDF Docs', count: 12, color: 'bg-red-50 text-red-600' },
          { label: 'Images', count: 45, color: 'bg-purple-50 text-purple-600' },
          { label: 'Prototypes', count: 8, color: 'bg-blue-50 text-blue-600' },
          { label: 'Archives', count: 3, color: 'bg-slate-50 text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors cursor-default">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{stat.count}</div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${stat.color}`}>
              i
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
