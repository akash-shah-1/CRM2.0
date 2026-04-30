import { useRef, useState } from 'react';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { Paperclip, SmilePlus, Search, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ChatInputProps {
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showMentionSuggestions: boolean;
  mentionSuggestions: any[];
  selectMention: (member: any) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (val: boolean) => void;
  showGifPicker: boolean;
  setShowGifPicker: (val: boolean) => void;
  giphySearch: string;
  setGiphySearch: (val: string) => void;
  isSearchingGifs: boolean;
  gifs: any[];
  handleSendGif: (url: string) => void;
  activeDMId: string | null;
  roomTitle: string;
}

export default function ChatInput({
  newMessage,
  setNewMessage,
  handleInputChange,
  handleSendMessage,
  handleFileUpload,
  showMentionSuggestions,
  mentionSuggestions,
  selectMention,
  showEmojiPicker,
  setShowEmojiPicker,
  showGifPicker,
  setShowGifPicker,
  giphySearch,
  setGiphySearch,
  isSearchingGifs,
  gifs,
  handleSendGif,
  activeDMId,
  roomTitle
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(newMessage + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions && mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % mentionSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectMention(mentionSuggestions[selectedIndex]);
        setSelectedIndex(0);
      } else if (e.key === 'Escape') {
        setSelectedIndex(0);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  return (
    <div className="px-6 py-6 bg-white border-t border-border">
      <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
        {showMentionSuggestions && mentionSuggestions.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-border rounded-md shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-2 border-b border-border bg-bg-light/30">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Mention Someone</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar">
              {mentionSuggestions.map((member, idx) => (
                <button
                  key={member.uid}
                  type="button"
                  onClick={() => selectMention(member)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 transition-colors text-left",
                    selectedIndex === idx ? "bg-primary/5" : "hover:bg-bg-light"
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center text-[10px] font-bold">
                    {(member.displayName || member.name || '?').charAt(0)}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="text-[12px] font-bold text-text-primary">{member.displayName || member.name}</div>
                    <div className="text-[10px] text-text-secondary">{member.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-bg-light/30 border border-border rounded-md p-1.5 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/30 transition-all">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
            accept="image/*"
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-text-secondary hover:text-primary hover:bg-white rounded-md transition-all"
          >
            <Paperclip size={20} />
          </button>
          <input 
            autoFocus
            value={newMessage}
            onChange={(e) => {
              handleInputChange(e);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeDMId ? roomTitle : '#' + roomTitle}...`}
            className="flex-1 bg-transparent border-none focus:ring-0 text-[13.5px] py-2 text-text-primary font-medium outline-none placeholder:text-text-secondary/50"
          />
          <div className="flex items-center gap-1 relative">
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl animate-in zoom-in-95 origin-bottom-right">
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme={Theme.LIGHT}
                  autoFocusSearch={false}
                  width={320}
                  height={400}
                />
              </div>
            )}
            <button 
              type="button" 
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowGifPicker(false);
              }}
              className={cn(
                "p-2.5 text-text-secondary hover:text-primary hover:bg-white rounded-md transition-all",
                showEmojiPicker && "text-primary bg-white shadow-sm"
              )}
            >
              <SmilePlus size={20} />
            </button>
            
            <div className="relative">
              {showGifPicker && (
                <div className="absolute bottom-full right-0 mb-4 w-72 bg-white border border-border rounded-md shadow-2xl z-50 animate-in zoom-in-95 origin-bottom-right overflow-hidden flex flex-col h-[400px]">
                  <div className="p-3 border-b border-border bg-bg-light/30">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" size={12} />
                      <input 
                        type="text" 
                        placeholder="Search Giphy..." 
                        value={giphySearch}
                        onChange={(e) => setGiphySearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                      />
                    </div>
                  </div>
                  <div className="flex-1 p-2 grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar bg-bg-light/10">
                    {isSearchingGifs ? (
                      <div className="col-span-2 flex items-center justify-center py-10 text-[11px] text-text-secondary font-bold animate-pulse uppercase">Searching...</div>
                    ) : gifs.length === 0 ? (
                      <div className="col-span-2 flex flex-col items-center justify-center py-10 opacity-40">
                        <Search size={30} className="mb-2" />
                        <p className="text-[11px] font-bold uppercase">Try searching for a GIF</p>
                      </div>
                    ) : gifs.map(gif => (
                      <button 
                        key={gif.id}
                        type="button"
                        onClick={() => handleSendGif(gif.images.fixed_height.url)}
                        className="group relative aspect-video bg-bg-light rounded overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                      >
                        <img src={gif.images.fixed_height.url} alt="GIF" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <Plus size={16} className="text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button 
                type="button" 
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                  if (!showGifPicker) setGiphySearch('');
                }}
                className={cn(
                  "hidden sm:flex p-2.5 text-[11px] font-bold rounded-md transition-all uppercase tracking-widest px-3",
                  showGifPicker ? "bg-primary text-white shadow-md shadow-primary/20" : "text-text-secondary hover:text-primary hover:bg-white"
                )}
              >
                GIF
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
