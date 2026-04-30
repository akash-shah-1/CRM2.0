import { useState, useRef, useEffect, useMemo } from 'react';
import { CHANNELS_DATA } from '../../dummy-data/tools';
import { 
  Hash, 
  Lock, 
  Search, 
  Plus, 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Circle
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../store/AuthContext';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrorHandler';

interface ChatMessage {
  id: string;
  channelId?: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  attachments?: { type: string, url: string }[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [activeDMId, setActiveDMId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredChannels = useMemo(() => {
    if (user?.role === 'admin') return channels;
    return channels.filter(c => !c.projectId || user?.projectAccess?.includes(c.projectId));
  }, [channels, user]);

  // Fetch channels
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'channels'), (snap) => {
      if (snap.empty) {
        CHANNELS_DATA.forEach(c => {
          addDoc(collection(db, 'channels'), { ...c, createdAt: serverTimestamp() }).catch(err => {
            console.error('Error seeding channel:', err);
          });
        });
      } else {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChannels(docs);
        if (docs.length > 0 && activeChannelId === '1' && !docs.find(c => c.id === '1')) {
          setActiveChannelId(docs[0].id);
        }
      }
      setIsLoadingChannels(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'channels');
    });
    return () => unsub();
  }, []);

  // Fetch team members (real users)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingTeam(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, []);

  // Real-time messages listener
  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    let q;

    if (activeDMId) {
      // Query messages where common participants include current user
      q = query(
        messagesRef,
        where('participants', 'array-contains', user?.uid),
        orderBy('timestamp', 'asc')
      );
    } else {
      q = query(
        messagesRef,
        where('channelId', '==', activeChannelId),
        orderBy('timestamp', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];

      // Client-side filtering for DMs if needed
      if (activeDMId) {
        setMessages(msgs.filter(m => 
          (m.senderId === user?.uid && m.recipientId === activeDMId) ||
          (m.senderId === activeDMId && m.recipientId === user?.uid)
        ));
      } else {
        setMessages(msgs);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [activeChannelId, activeDMId, user?.uid]);

  // Current messages for the view (now directly from state)
  const currentMessages = messages;

  // Current room title/info
  const roomInfo = useMemo(() => {
    if (activeDMId) {
      const member = teamMembers.find(m => m.id === activeDMId || m.uid === activeDMId);
      return { title: member?.displayName || member?.name, description: member?.role || member?.department, type: 'dm', status: member?.status || 'offline' };
    }
    const channel = channels.find(c => c.id === activeChannelId);
    return { title: channel?.name, description: channel?.description, type: channel?.type };
  }, [activeChannelId, activeDMId, channels, teamMembers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg = newMessage.trim();

    const msgData: any = {
      text: userMsg,
      senderId: user?.uid || 'unknown',
      senderName: user?.displayName || 'You',
      timestamp: serverTimestamp(),
      ...(activeDMId ? { 
        recipientId: activeDMId,
        participants: [user?.uid || 'unknown', activeDMId]
      } : { 
        channelId: activeChannelId,
        participants: [user?.uid || 'unknown'] 
      })
    };

    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), msgData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Timestamp || (timestamp && typeof timestamp.toDate === 'function')
      ? timestamp.toDate() 
      : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-white border border-border rounded-md overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-bg-light/30">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
            <input 
              type="text" 
              placeholder="Jump to..." 
              className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Channels */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between group">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Channels</span>
              <button className="text-text-secondary hover:text-text-primary transition-colors">
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
                  {channel.type === 'private' ? <Lock size={12} className={cn(activeChannelId === channel.id && !activeDMId ? "text-white" : "text-text-secondary")} /> : <Hash size={12} className={cn(activeChannelId === channel.id && !activeDMId ? "text-white" : "text-text-secondary")} />}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between group">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Direct Messages</span>
              <button className="text-text-secondary hover:text-text-primary transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {isLoadingTeam ? (
                <div className="px-3 py-2 text-[10px] text-text-secondary animate-pulse font-bold">LOADING...</div>
              ) : teamMembers.filter(m => m.uid !== user?.uid).length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-text-secondary font-medium">No other users yet</div>
              ) : teamMembers.filter(m => m.uid !== user?.uid).map((member) => (
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
                      member.status === 'online' ? "bg-success" : member.status === 'away' ? "bg-warning" : "bg-text-secondary/50"
                    )} />
                  </div>
                  <span className="truncate">{member.displayName || member.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-md bg-bg-light flex items-center justify-center border border-border text-text-secondary font-bold text-[14px]">
                {activeDMId ? (
                   (roomInfo?.title || '?').charAt(0)
                ) : (
                   <Hash size={20} />
                )}
             </div>
             <div className="text-left">
                <div className="flex items-center gap-2 font-bold text-text-primary text-[15px] leading-tight">
                  {roomInfo.title}
                  {roomInfo.status && (
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      roomInfo.status === 'online' ? "bg-success" : roomInfo.status === 'away' ? "bg-warning" : "bg-text-secondary/50"
                    )} />
                  )}
                </div>
                <div className="text-[11px] font-medium text-text-secondary truncate max-w-[300px] mt-0.5">{roomInfo.description}</div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all">
                <Phone size={18} />
             </button>
             <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all">
                <Video size={18} />
             </button>
             <div className="w-px h-4 bg-border mx-2" />
             <button className="p-2 text-text-secondary hover:text-primary hover:bg-primary/5 rounded-md transition-all">
                <Info size={18} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-bg-light/10 custom-scrollbar">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
               <div className="w-20 h-20 rounded-md bg-bg-light flex items-center justify-center border border-border mb-4">
                  <Send size={40} className="text-primary/30 -translate-x-1 translate-y-1" />
               </div>
               <p className="text-[14px] font-bold text-text-primary">New Conversation</p>
               <p className="text-[12px] mt-1 font-medium">Send a message to get things started!</p>
            </div>
          ) : (
            currentMessages.map((msg, i) => {
              const isOwn = msg.senderId === user?.uid;
              const prevMsg = currentMessages[i - 1];
              const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={cn(
                  "flex gap-4",
                  isOwn ? "flex-row-reverse" : "flex-row",
                  !showHeader && "-mt-6"
                )}>
                  {showHeader ? (
                    <div className="w-9 h-9 rounded-md bg-bg-light flex items-center justify-center text-[10px] font-bold text-text-primary shrink-0 border border-border font-mono">
                      {msg.senderName?.charAt(0) || '?'}
                    </div>
                  ) : (
                    <div className="w-9 shrink-0" />
                  )}
                  <div className={cn(
                    "flex flex-col max-w-[70%]",
                    isOwn ? "items-end" : "items-start"
                  )}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1.5 px-0.5">
                        <span className="text-[12px] font-bold text-text-primary">{msg.senderName}</span>
                        <span className="text-[10px] text-text-secondary font-bold uppercase">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-3 text-[13.5px] font-medium shadow-sm transition-all relative break-words",
                      isOwn 
                        ? "bg-primary text-white rounded-md rounded-tr-none shadow-primary/10" 
                        : "bg-white text-text-primary border border-border rounded-md rounded-tl-none shadow-black/[0.02]",
                      !showHeader && (isOwn ? "rounded-tr-md" : "rounded-tl-md")
                    )}>
                      {msg.text}
                      {msg.attachments?.map((att, idx) => (
                        <div key={idx} className="mt-3 rounded-md overflow-hidden border border-border/20 shadow-sm first:mt-2">
                          {att.type === 'image' && <img src={att.url} alt="Attachment" className="max-w-full h-auto block" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-6 bg-white border-t border-border">
          <form onSubmit={handleSendMessage} className="relative max-w-4xl mx-auto">
            <div className="flex items-center gap-2 bg-bg-light/30 border border-border rounded-md p-1.5 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/30 transition-all">
               <button type="button" className="p-2.5 text-text-secondary hover:text-primary hover:bg-white rounded-md transition-all">
                 <Paperclip size={20} />
               </button>
               <input 
                 type="text" 
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder={`Message ${activeDMId ? roomInfo.title : '#' + roomInfo.title}...`}
                 className="flex-1 bg-transparent border-none focus:ring-0 text-[13.5px] py-2 text-text-primary font-medium outline-none placeholder:text-text-secondary/50"
               />
               <button type="button" className="p-2.5 text-text-secondary hover:text-primary hover:bg-white rounded-md transition-all">
                 <Smile size={20} />
               </button>
               <button 
                 type="submit"
                 disabled={!newMessage.trim()}
                 className={cn(
                   "p-2.5 rounded-md transition-all",
                   newMessage.trim() 
                    ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95" 
                    : "bg-bg-light text-text-secondary/30 pointer-events-none"
                 )}
               >
                 <Send size={20} />
               </button>
            </div>
            <div className="flex items-center gap-4 mt-3 px-1 text-[11px] text-text-secondary font-bold uppercase tracking-wider">
               <div className="flex items-center gap-1.5"><Circle size={8} className="fill-success text-success animate-pulse" /> 5 team members online</div>
               <div className="flex items-center gap-1.5 underline cursor-pointer hover:text-text-primary transition-colors decoration-primary/30 underline-offset-2">Markdown supported</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
