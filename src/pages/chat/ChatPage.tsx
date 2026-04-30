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
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-100 flex flex-col bg-slate-50/10">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Jump to..." 
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100/50 border-transparent rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Channels */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Channels</span>
              <button className="text-slate-400 hover:text-slate-600">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {isLoadingChannels ? (
                <div className="px-3 py-2 text-[10px] text-slate-400 animate-pulse">Loading channels...</div>
              ) : filteredChannels.length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-slate-400">No channels found</div>
              ) : filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setActiveChannelId(channel.id);
                    setActiveDMId(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    activeChannelId === channel.id && !activeDMId 
                      ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {channel.type === 'private' ? <Lock size={12} /> : <Hash size={12} />}
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between group">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Direct Messages</span>
              <button className="text-slate-400 hover:text-slate-600">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {isLoadingTeam ? (
                <div className="px-3 py-2 text-[10px] text-slate-400 animate-pulse">Loading team...</div>
              ) : teamMembers.filter(m => m.uid !== user?.uid).length === 0 ? (
                <div className="px-3 py-2 text-[10px] text-slate-400">No other users yet</div>
              ) : teamMembers.filter(m => m.uid !== user?.uid).map((member) => (
                <button
                  key={member.uid}
                  onClick={() => {
                    setActiveDMId(member.uid);
                    setActiveChannelId('');
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    activeDMId === member.uid 
                      ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100/50" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                      {(member.displayName || member.name || '?').charAt(0)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white",
                      member.status === 'online' ? "bg-emerald-500" : member.status === 'away' ? "bg-amber-500" : "bg-slate-300"
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
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white shadow-sm z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
                {activeDMId ? (
                   <div className="font-bold text-slate-600 text-sm">{(roomInfo?.title || '?').charAt(0)}</div>
                ) : (
                   <Hash size={20} />
                )}
             </div>
             <div className="text-left">
                <div className="flex items-center gap-2 font-bold text-slate-900 leading-tight">
                  {roomInfo.title}
                  {roomInfo.status && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      roomInfo.status === 'online' ? "bg-emerald-500" : roomInfo.status === 'away' ? "bg-amber-500" : "bg-slate-300"
                    )} />
                  )}
                </div>
                <div className="text-[10px] font-medium text-slate-400 truncate max-w-[300px]">{roomInfo.description}</div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Phone size={18} />
             </button>
             <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Video size={18} />
             </button>
             <div className="w-px h-4 bg-slate-100 mx-1" />
             <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                <Info size={18} />
             </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
               <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-4 opacity-50">
                  <Send size={32} className="rotate-45 -translate-x-1" />
               </div>
               <p className="text-sm font-medium">This is the start of your conversation.</p>
               <p className="text-xs mt-1">Send a message to get things started!</p>
            </div>
          ) : (
            currentMessages.map((msg, i) => {
              const isOwn = msg.senderId === user?.uid;
              const prevMsg = currentMessages[i - 1];
              const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

              return (
                <div key={msg.id} className={cn(
                  "flex gap-3",
                  isOwn ? "flex-row-reverse" : "flex-row",
                  !showHeader && "mt-1"
                )}>
                  {showHeader ? (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 border border-slate-200">
                      {msg.senderName?.charAt(0) || '?'}
                    </div>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                  <div className={cn(
                    "flex flex-col max-w-[70%]",
                    isOwn ? "items-end" : "items-start"
                  )}>
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-xs font-bold text-slate-900">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-400">{formatMessageTime(msg.timestamp)}</span>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-2 text-sm shadow-sm transition-all",
                      isOwn 
                        ? "bg-slate-900 text-white rounded-2xl rounded-tr-none" 
                        : "bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-none",
                      !showHeader && (isOwn ? "rounded-tr-none" : "rounded-tl-none")
                    )}>
                      {msg.text}
                      {msg.attachments?.map((att, idx) => (
                        <div key={idx} className="mt-2 rounded-lg overflow-hidden border border-slate-100/20">
                          {att.type === 'image' && <img src={att.url} alt="Attachment" className="max-w-full h-auto" />}
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
        <div className="px-6 py-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="relative">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all">
               <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                 <Paperclip size={20} />
               </button>
               <input 
                 type="text" 
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 placeholder={`Message ${activeDMId ? roomInfo.title : '#' + roomInfo.title}...`}
                 className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-slate-900"
               />
               <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                 <Smile size={20} />
               </button>
               <button 
                 type="submit"
                 disabled={!newMessage.trim()}
                 className={cn(
                   "p-2 rounded-xl transition-all",
                   newMessage.trim() 
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:scale-105 active:scale-95" 
                    : "bg-slate-100 text-slate-300 pointer-events-none"
                 )}
               >
                 <Send size={20} />
               </button>
            </div>
            <div className="flex items-center gap-4 mt-2 px-2 text-[10px] text-slate-400 font-medium">
               <div className="flex items-center gap-1.5"><Circle size={8} className="fill-emerald-500 text-emerald-500" /> 5 team members online</div>
               <div className="flex items-center gap-1.5 underline cursor-pointer hover:text-slate-600">Markdown syntax supported</div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
