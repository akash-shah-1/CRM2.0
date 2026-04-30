import { useState, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { NOTES_DATA } from '../../dummy-data/tools';
import { useAuth } from '../../store/AuthContext';
import { useSearch } from '../../hooks/useSearch';
import { FileText, Plus, Search, Calendar, Tag, Trash2, Edit } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/FormElements';
import { ActionMenu } from '../../components/common/ActionMenu';

import { subscribeToNotes, createNote, updateNote, removeNote, NoteData } from '../../services/noteService';
import { Skeleton } from '../../components/ui/Skeleton';

export default function NotesPage({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [dbNotes, setDbNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotes(isAdmin, user.projectAccess || [], (data) => {
      setDbNotes(data);
      setIsLoading(false);
    });
    return () => unsub();
  }, [user, isAdmin]);

  const combinedNotes = useMemo(() => {
    const accessibleDummy = isAdmin 
      ? NOTES_DATA 
      : NOTES_DATA.filter(n => user?.projectAccess?.includes(n.projectId));
    return [...dbNotes, ...accessibleDummy];
  }, [dbNotes, isAdmin, user?.projectAccess]);

  const filteredNotesByProject = useMemo(() => {
    if (!projectId) return combinedNotes;
    return combinedNotes.filter(n => n.projectId === projectId);
  }, [combinedNotes, projectId]);

  const [selectedNote, setSelectedNote] = useState<any>(null);
  
  useEffect(() => {
    if (!selectedNote && filteredNotesByProject.length > 0) {
      setSelectedNote(filteredNotesByProject[0]);
    }
  }, [filteredNotesByProject, selectedNote]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', content: '', category: 'General' });

  const { searchTerm, setSearchTerm, filteredData } = useSearch(filteredNotesByProject, ['title', 'category', 'content']);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNote) {
      if (editingNote.id.length > 10) {
        await updateNote(editingNote.id, formData);
      }
    } else {
      await createNote({
        projectId: projectId || '1',
        ...formData,
        authorId: user?.uid,
        authorName: user?.displayName || 'Unknown'
      });
    }
    
    setIsModalOpen(false);
    setFormData({ title: '', content: '', category: 'General' });
    setEditingNote(null);
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content, category: note.category });
    setIsModalOpen(true);
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      if (id.length > 10) {
        await removeNote(id);
      }
      if (selectedNote?.id === id) setSelectedNote(null);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Just now';
    if (typeof date === 'string') return date;
    const d = date.toMillis ? new Date(date.toMillis()) : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-left">Notes System</h2>
          <p className="text-slate-500 text-sm text-left text-balance">Organize thoughts and documentation with markdown support.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={18} />
          Create Note
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-md border border-slate-200 shadow-sm flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="p-3 space-y-2 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : filteredData.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`w-full text-left p-3 rounded-md transition-colors group relative ${
                  selectedNote?.id === note.id ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-100 border border-transparent'
                }`}
              >
                <div className="font-semibold text-slate-900 text-sm truncate pr-6">{note.title}</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1 uppercase tracking-wider">{note.category}</span>
                  <span>{formatDate(note.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor/Preview */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedNote ? (
            <>
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 text-left">{selectedNote.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={14} /> Created {formatDate(selectedNote.createdAt)}</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-bold uppercase text-[10px] tracking-widest"><Tag size={10} /> {selectedNote.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleEditNote(selectedNote)}
                     className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
                   >
                     <Edit size={18} />
                   </button>
                   <button 
                     onClick={() => handleDeleteNote(selectedNote.id)}
                     className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                   >
                     <Trash2 size={18} />
                   </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none prose-sm text-left markdown-body">
                <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <FileText size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a note to view its contents or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        title={editingNote ? "Edit Note" : "Create New Note"}
        footer={
          <>
            <button onClick={() => {
              setIsModalOpen(false);
              setEditingNote(null);
            }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">Cancel</button>
            <button onClick={handleAddNote} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md">
              {editingNote ? "Update Note" : "Create Note"}
            </button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleAddNote}>
          <Input 
            label="Title" 
            value={formData.title} 
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Project Requirements"
            required
          />
          <Input 
            label="Category" 
            value={formData.category} 
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g. Design, Technical"
            required
          />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Content (Markdown supported)</label>
            <textarea 
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
              placeholder="# Markdown title..."
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
