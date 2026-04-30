import { Search, Plus, Hash, Lock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ChatRoom } from './types';

interface ChatSidebarProps {
  sidebarSearch: string;
  setSidebarSearch: (val: string) => void;
  isLoadingChannels: boolean;
  filteredChannels: ChatRoom[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  isLoadingTeam: boolean;
  filteredTeamMembers: any[];
  activeDMId: string | null;
  setActiveDMId: (id: string | null) => void;
  setIsCreateChannelModalOpen: (val: boolean) => void;
  isUserOnline: (member: any) => boolean;
  getUnreadCount: (id: string) => number;
}

export default function ChatSidebar({
  sidebarSearch,
  setSidebarSearch,
  isLoadingChannels,
  filteredChannels,
  activeChannelId,
  setActiveChannelId,
  isLoadingTeam,
  filteredTeamMembers,
  activeDMId,
  setActiveDMId,
  setIsCreateChannelModalOpen,
  isUserOnline,
  getUnreadCount
}: ChatSidebarProps) {
  return (
    <div className="w-64 border-r border-border flex flex-col bg-bg-light/30">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
          <input 
            type="text" 
            placeholder="Jump to..." 
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {/* Channels */}
        <div>
          <div className="px-3 mb-1.5 flex items-center justify-between group">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Channels</span>
            <button 
              onClick={() => setIsCreateChannelModalOpen(true)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="Create Channel"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {isLoadingChannels ? (
              <div className="px-3 py-2 text-[10px] text-text-secondary animate-pulse font-bold">LOADING...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-text-secondary font-medium">No channels found</div>
            ) : filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setActiveDMId(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
                  activeChannelId === channel.id && !activeDMId 
                    ? "bg-primary text-white shadow-sm shadow-primary/20" 
                    : "text-text-secondary hover:bg-white hover:text-text-primary"
                )}
              >
                {channel.type === 'private' ? <Lock size={12} className={cn(activeChannelId === channel.id && !activeDMId ? "text-white" : "text-text-secondary/60")} /> : <Hash size={12} className={cn(activeChannelId === channel.id && !activeDMId ? "text-white" : "text-text-secondary/60")} />}
                <span className="truncate">{channel.name}</span>
                {getUnreadCount(channel.id) > 0 && (
                  <span className="ml-auto flex items-center justify-center w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-white shadow-sm">
                    {getUnreadCount(channel.id)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages */}
        <div>
          <div className="px-3 mb-1.5 flex items-center justify-between group">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Direct Messages</span>
            <button 
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="New Group DM"
              onClick={() => setIsCreateChannelModalOpen(true)}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {isLoadingTeam ? (
              <div className="px-3 py-2 text-[10px] text-text-secondary animate-pulse font-bold">LOADING...</div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-text-secondary font-medium">No members found</div>
            ) : filteredTeamMembers.map((member) => (
              <button
                key={member.uid}
                onClick={() => {
                  setActiveDMId(member.uid);
                  setActiveChannelId('');
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all group",
                  activeDMId === member.uid 
                    ? "bg-primary text-white shadow-sm shadow-primary/20" 
                    : "text-text-secondary hover:bg-white hover:text-text-primary"
                )}
              >
                <div className="relative shrink-0">
                  <div className="w-5 h-5 rounded-md bg-bg-light flex items-center justify-center text-[9px] font-bold text-text-primary border border-border group-hover:bg-white transition-all">
                    {(member.displayName || member.name || '?').charAt(0)}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white",
                    isUserOnline(member) ? "bg-success" : member.status === 'away' ? "bg-warning" : "bg-text-secondary/50"
                  )} />
                </div>
                <span className="truncate">{member.displayName || member.name}</span>
                {getUnreadCount(member.uid) > 0 && (
                  <span className="ml-auto flex items-center justify-center w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-white shadow-sm">
                    {getUnreadCount(member.uid)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
