import { Hash, Search, X, Info, Trash2, Users } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ChatHeaderProps {
  roomInfo: any;
  showChatSearch: boolean;
  setShowChatSearch: (val: boolean) => void;
  chatSearch: string;
  setChatSearch: (val: string) => void;
  isUserOnline: (member: any) => boolean;
  onDeleteRoom?: () => void;
  canManage?: boolean;
}

export default function ChatHeader({
  roomInfo,
  showChatSearch,
  setShowChatSearch,
  chatSearch,
  setChatSearch,
  isUserOnline,
  onDeleteRoom,
  canManage
}: ChatHeaderProps) {
  return (
    <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-white z-10 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-bg-light flex items-center justify-center border border-border text-text-secondary font-bold text-[14px]">
          {roomInfo.type === 'dm' ? (
            (roomInfo?.title || '?').charAt(0)
          ) : (
            <Hash size={20} />
          )}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2 font-bold text-text-primary text-[15px] leading-tight">
            {roomInfo.title}
            {roomInfo.type === 'dm' && (
              <div className={cn(
                "w-2 h-2 rounded-full",
                isUserOnline({ status: roomInfo.status, lastSeen: roomInfo.lastSeen }) ? "bg-success" : roomInfo.status === 'away' ? "bg-warning" : "bg-text-secondary/50"
              )} />
            )}
          </div>
          <div className="text-[11px] font-medium text-text-secondary truncate max-w-[300px] mt-0.5">{roomInfo.description || 'No description set'}</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {showChatSearch ? (
          <div className="flex items-center gap-2 bg-bg-light rounded-md px-2 py-1 mr-2 animate-in slide-in-from-right-4 duration-200">
            <Search size={14} className="text-text-secondary" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[12px] p-0 w-32 outline-none font-medium"
            />
            <button onClick={() => { setShowChatSearch(false); setChatSearch(''); }}>
              <X size={14} className="text-text-secondary hover:text-danger hover:scale-110 transition-all" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowChatSearch(true)}
            className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all"
          >
            <Search size={18} />
          </button>
        )}
        
        {roomInfo.type !== 'dm' && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all" title="View Members">
              <Users size={18} />
            </button>
            {canManage && (
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this channel and all its messages?')) {
                    onDeleteRoom?.();
                  }
                }}
                className="p-2 text-text-secondary hover:text-danger hover:bg-danger/5 rounded-md transition-all" 
                title="Delete Channel"
              >
                <Trash2 size={18} />
              </button>
            )}
          </>
        )}
        
        <div className="w-px h-4 bg-border mx-1" />
        <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all">
          <Info size={18} />
        </button>
      </div>
    </div>
  );
}
