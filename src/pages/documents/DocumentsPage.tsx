import { useState, useMemo, useEffect } from 'react';
import { DOCUMENTS_DATA } from '../../dummy-data/tools';
import { useAuth } from '../../store/AuthContext';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { File, Download, Search, Plus, Filter, FileText, FileImage, FileArchive, Trash2, Edit } from 'lucide-react';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { logActivity } from '../../utils/activity';
import { createNotification } from '../../utils/notifications';
import { subscribeToDocuments, uploadDocument, removeDocument, DocumentData } from '../../services/documentService';

import { PageTransition } from '../../components/common/PageTransition';
import { Skeleton } from '../../components/ui/Skeleton';

export default function DocumentsPage({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const accessibleDocs = useMemo(() => {
    if (isAdmin) return DOCUMENTS_DATA;
    return DOCUMENTS_DATA.filter(d => user?.projectAccess?.includes(d.projectId));
  }, [user, isAdmin]);

  const [dbData, setDbData] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync with Firestore
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToDocuments(isAdmin, user.projectAccess || [], (docs) => {
      setDbData(docs);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user, isAdmin]);

  const combinedData = useMemo(() => {
    const filteredDbData = isAdmin 
      ? dbData 
      : dbData.filter(d => user?.projectAccess?.includes(d.projectId));
    
    // Merge initial dummy data and Firestore data
    return [...filteredDbData, ...accessibleDocs];
  }, [dbData, accessibleDocs, isAdmin, user?.projectAccess]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({ name: '', type: 'PDF', projectId: projectId || '1' });
  
  const filteredDocsByProject = useMemo(() => {
    if (!projectId) return combinedData;
    return combinedData.filter(d => d.projectId === projectId);
  }, [combinedData, projectId]);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(filteredDocsByProject, ['name', 'projectId', 'type']);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !selectedFile) return;

    try {
      const fileName = formData.name || selectedFile?.name || 'Untitled Document';
      const fileSize = selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : '1.2 MB';
      
      await uploadDocument({
        name: fileName,
        type: formData.type,
        size: fileSize,
        projectId: formData.projectId,
        uploadedBy: user?.displayName || 'Current User',
        uploadedByUid: user?.uid,
      });
      
      // Notify admins about the new document
      await createNotification({
        title: 'New Document Uploaded',
        message: `${user?.displayName} uploaded "${fileName}" to the platform.`,
        type: 'success',
        userId: 'admin' // Broadcast to admins
      });

      setIsModalOpen(false);
      setFormData({ name: '', type: 'PDF', projectId: projectId || '1' });
      setSelectedFile(null);

      logActivity({
        userId: user?.uid || 'unknown',
        userName: user?.displayName || 'Unknown',
        action: 'uploaded document',
        target: fileName,
        projectId: formData.projectId,
        type: 'document'
      });
    } catch (error) {
       // Service context already handled error throwing if needed
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PDF': return <FileText className="text-red-500" size={18} />;
      case 'FIGMA': return <FileImage className="text-purple-500" size={18} />;
      case 'DOCX': return <File className="text-blue-500" size={18} />;
      default: return <FileArchive className="text-slate-400" size={18} />;
    }
  };

  const handleDelete = async (id: string, isFromDb: boolean) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    if (isFromDb) {
      try {
        const docToDelete = dbData.find(d => d.id === id);
        await removeDocument(id);
        
        if (docToDelete) {
          logActivity({
            userId: user?.uid || 'unknown',
            userName: user?.displayName || 'Unknown',
            action: 'deleted document',
            target: docToDelete.name,
            projectId: docToDelete.projectId,
            type: 'document'
          });
        }
      } catch (error) {
        // Error handled/thrown by service
      }
    }
    // Dummy filter logic removed if choosing to rely solely on Firestore sync
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
      render: (item: any) => (
        <div className="flex items-center justify-end gap-2">
          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent">
            <Download size={16} />
          </button>
          <ActionMenu 
            items={[
              { label: 'Rename', onClick: () => console.log('Rename', item.id) },
              { label: 'Share Link', onClick: () => console.log('Share', item.id) },
              { label: 'Delete', onClick: () => handleDelete(item.id, !!item.createdAt && typeof item.createdAt !== 'string'), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
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

          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                   <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10" />
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
            <DataTable 
              columns={columns}
              data={filteredData}
            />
          )}
        </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload New Document"
        footer={
          <div className="flex items-center justify-end w-full gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-lg transition-all">Cancel</button>
            <button 
              onClick={handleUpload} 
              className="px-6 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
              disabled={!selectedFile && !formData.name}
            >
              Upload Document
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleUpload}>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select File</label>
            <div className="relative group">
              <input 
                type="file" 
                className="hidden" 
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    // Automatically set file name if not already set
                    if (!formData.name) {
                      setFormData(prev => ({ ...prev, name: file.name }));
                    }
                    // Try to guess type from extension
                    const ext = file.name.split('.').pop()?.toUpperCase();
                    if (ext === 'PDF' || ext === 'DOCX') {
                      setFormData(prev => ({ ...prev, type: ext }));
                    } else if (ext === 'ZIP' || ext === 'RAR') {
                      setFormData(prev => ({ ...prev, type: 'ZIP' }));
                    }
                  }
                }}
              />
              <label 
                htmlFor="file-upload"
                className="flex items-center justify-center gap-3 px-4 py-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <Plus size={24} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-slate-900">{selectedFile ? selectedFile.name : 'Choose a file...'}</div>
                  <p className="text-[10px] text-slate-400">or drag and drop here</p>
                </div>
              </label>
            </div>
          </div>

          <Input 
            label="Override Display Name" 
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
    </PageTransition>
  );
}
