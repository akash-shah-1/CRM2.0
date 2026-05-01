import { useState, useMemo, useEffect } from 'react';
import { DOCUMENTS_DATA } from '../../dummy-data/tools';
import { useAuth } from '../../store/AuthContext';
import { useSearch } from '../../hooks/useSearch';
import { DataTable } from '../../components/common/DataTable';
import { File, Download, Search, Plus, Filter, FileText, FileImage, FileArchive, Trash2, Edit } from 'lucide-react';
import { ActionMenu } from '../../components/common/ActionMenu';
import { Modal } from '../../components/ui/Modal';
import { FileViewerModal } from '../../components/common/FileViewerModal';
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
  const [viewingFile, setViewingFile] = useState<{ name: string, url: string, type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({ name: '', type: 'PDF', projectId: projectId || '1' });
  
  const filteredDocsByProject = useMemo(() => {
    if (!projectId) return combinedData;
    return combinedData.filter(d => d.projectId === projectId);
  }, [combinedData, projectId]);

  const { searchTerm, setSearchTerm, filteredData } = useSearch(filteredDocsByProject, ['name', 'projectId', 'type']);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    if (!formData.name && !selectedFile) return;

    setIsUploading(true);
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
      }, selectedFile || undefined);
      
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
    } catch (error: any) {
       console.error("Upload failed:", error);
       alert("Upload failed. Please check your connection or permissions.");
    } finally {
       setIsUploading(false);
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

  const handleDelete = async (id: string, isFromDb: boolean, storagePath?: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    if (isFromDb) {
      try {
        const docToDelete = dbData.find(d => d.id === id);
        await removeDocument(id, storagePath);
        
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
        <div 
          className="flex items-center gap-3 cursor-pointer group/name"
          onClick={() => {
            if (doc.type === 'PDF') {
              setViewingFile({ 
                name: doc.name, 
                url: doc.url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
                type: 'pdf' 
              });
            } else if (doc.url) {
              window.open(doc.url, '_blank');
            }
          }}
        >
          <div className="w-9 h-9 rounded-md bg-bg-light flex items-center justify-center border border-border group-hover/name:bg-primary/10 transition-colors">
            {getFileIcon(doc.type)}
          </div>
          <div>
            <div className="font-semibold text-text-primary text-[13.5px] group-hover/name:text-primary transition-colors">{doc.name}</div>
            <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{doc.type} • {doc.size}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Association',
      key: 'projectId',
      render: (doc: any) => (
        <span className="text-[13px] font-medium text-text-secondary">{doc.projectId}</span>
      ),
    },
    {
      header: 'By',
      key: 'uploadedBy',
      render: (doc: any) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
            {doc.uploadedBy?.charAt(0) || '?'}
          </div>
          <span className="text-[12px] text-text-secondary font-medium">{doc.uploadedBy || 'Unknown User'}</span>
        </div>
      ),
    },
    {
      header: '',
      key: 'actions',
      align: 'right' as const,
      render: (item: any) => (
        <div className="flex items-center justify-end gap-1">
          {item.url && (
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/5 rounded transition-all"
              title="Download File"
            >
              <Download size={16} />
            </a>
          )}
          <ActionMenu 
            items={[
              { 
                label: 'View Document', 
                onClick: () => {
                  if (item.type === 'PDF') {
                    setViewingFile({ 
                      name: item.name, 
                      url: item.url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
                      type: 'pdf' 
                    });
                  } else if (item.url) {
                    window.open(item.url, '_blank');
                  }
                }, 
                icon: FileText 
              },
              { label: 'Rename', onClick: () => console.log('Rename', item.id) },
              { label: 'Share Link', onClick: () => item.url && navigator.clipboard.writeText(item.url) },
              { label: 'Delete', onClick: () => handleDelete(item.id, !!item.createdAt && typeof item.createdAt !== 'string', item.storagePath), variant: 'danger' },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">Document Center</h2>
            <p className="text-text-secondary text-[13px]">Centralized repository for project assets and contracts.</p>
          </div>
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-all text-[13px] font-bold shadow-sm active:scale-95"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            + Upload File
          </button>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden">
          <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-bg-light border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-bold text-text-secondary bg-white border border-border rounded hover:bg-bg-light transition-all">
                <Filter size={14} />
                Filter
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-bg-light" />
                      <div className="space-y-2">
                         <div className="h-3 bg-bg-light rounded w-40" />
                         <div className="h-2 bg-bg-light rounded w-20" />
                      </div>
                   </div>
                   <div className="h-4 bg-bg-light rounded w-24" />
                   <div className="h-4 bg-bg-light rounded w-32" />
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
        title="Upload New Document"
        footer={
          <div className="flex items-center justify-end w-full gap-3">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-text-secondary hover:bg-bg-light rounded transition-all">Cancel</button>
            <button 
              onClick={handleUpload} 
              className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded shadow-sm shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 disabled:opacity-50"
              disabled={isUploading || (!selectedFile && !formData.name)}
            >
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleUpload}>
          <div className="space-y-2">
            <label className="text-[12px] font-semibold text-text-primary">Source File</label>
            <div className="relative group">
              <input 
                type="file" 
                className="hidden" 
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    if (!formData.name) {
                      setFormData(prev => ({ ...prev, name: file.name }));
                    }
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
                className="flex flex-col items-center justify-center gap-3 px-4 py-10 border-2 border-dashed border-border rounded hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded bg-bg-light flex items-center justify-center text-text-secondary group-hover:bg-primary group-hover:text-white transition-all">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <div className="text-[13px] font-bold text-text-primary">{selectedFile ? selectedFile.name : 'Click to browse...'}</div>
                  <p className="text-[11px] text-text-secondary">Supported: PDF, FIGMA, DOCX, ZIP</p>
                </div>
              </label>
            </div>
          </div>

          <Input 
            label="Display Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Sales Report 2026"
            required
          />
          <Select 
            label="File Type / Category" 
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

      <FileViewerModal 
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        file={viewingFile}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'PDF Docs', count: 12, color: 'text-rose-500', bg: 'bg-rose-50' },
          { label: 'Images / Assets', count: 45, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Cloud Links', count: 8, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Archives', count: 3, color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-lg border border-border shadow-sm flex items-center gap-4 group hover:border-primary/30 transition-all cursor-default">
            <div className={`w-12 h-12 rounded flex items-center justify-center ${stat.bg} ${stat.color} transition-all group-hover:bg-primary group-hover:text-white`}>
              <File size={20} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">{stat.label}</div>
              <div className="text-xl font-bold text-text-primary leading-none">{stat.count}</div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </PageTransition>
  );
}
