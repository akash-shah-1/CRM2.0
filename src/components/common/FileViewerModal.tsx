import { Modal } from '../ui/Modal';
import { FileText, Download, ExternalLink } from 'lucide-react';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    name: string;
    url: string;
    type: string;
  } | null;
}

export function FileViewerModal({ isOpen, onClose, file }: FileViewerModalProps) {
  if (!file) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={file.name}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[12px] text-text-secondary flex items-center gap-2">
            <FileText size={14} />
            <span>PDF Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.open(file.url, '_blank')}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold text-text-primary hover:bg-bg-light rounded-md transition-all border border-border"
            >
              <ExternalLink size={14} />
              Open External
            </button>
            <a 
              href={file.url} 
              download={file.name}
              className="flex items-center gap-2 px-4 py-1.5 text-[12px] font-bold text-white bg-primary hover:bg-primary-hover rounded-md shadow-sm transition-all"
            >
              <Download size={14} />
              Download
            </a>
          </div>
        </div>
      }
    >
      <div className="w-full h-[70vh] bg-bg-light rounded-md border border-border overflow-hidden">
        {file.type === 'pdf' ? (
          <iframe 
            src={`${file.url}#toolbar=0`} 
            className="w-full h-full" 
            title={file.name}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-4">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border border-border shadow-sm">
                <FileText size={32} className="text-slate-300" />
             </div>
             <p className="font-medium">Preview not available for this file type.</p>
             <a href={file.url} download className="text-primary font-bold hover:underline">Download instead</a>
          </div>
        )}
      </div>
    </Modal>
  );
}
