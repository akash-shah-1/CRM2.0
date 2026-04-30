import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../store/AuthContext';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  limit
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { handleFirestoreError, OperationType } from '../../utils/firebaseErrorHandler';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/FormElements';
import { createNotification } from '../../utils/notifications';
import { CHANNELS_DATA } from '../../dummy-data/tools';

// New specialized components
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatInput from '../../components/chat/ChatInput';
import { ChatMessage, ChatRoom } from '../../components/chat/types';

export default function ChatPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChatRoom[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [activeDMId, setActiveDMId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // States used by sub-components
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  
  // Mention & Picker states
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);

  // Modal states
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '', type: 'public' });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmittingChannel, setIsSubmittingChannel] = useState(false);

  const [lastRead, setLastRead] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`chat_last_read_${user?.uid}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [allRecentMessages, setAllRecentMessages] = useState<ChatMessage[]>([]);

  // Filtering logic
  const filteredChannels = useMemo(() => {
    let list = user?.role === 'admin' ? channels : channels.filter(c => !c.projectId || user?.projectAccess?.includes(c.projectId));
    if (sidebarSearch) list = list.filter(c => c.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
    return list;
  }, [channels, user, sidebarSearch]);

  const filteredTeamMembers = useMemo(() => {
    let list = teamMembers.filter(m => m.uid !== user?.uid);
    if (sidebarSearch) list = list.filter(m => (m.displayName || '').toLowerCase().includes(sidebarSearch.toLowerCase()));
    return list;
  }, [teamMembers, user, sidebarSearch]);

  const filteredMessages = useMemo(() => {
    if (!chatSearch) return messages;
    return messages.filter(m => m.text.toLowerCase().includes(chatSearch.toLowerCase()));
  }, [messages, chatSearch]);

  const roomInfo = useMemo(() => {
    if (activeDMId) {
      const member = teamMembers.find(m => m.uid === activeDMId);
      return { 
        title: member?.displayName || member?.name, 
        description: member?.role, 
        type: 'dm', 
        status: member?.status,
        lastSeen: member?.lastSeen
      };
    }
    const channel = channels.find(c => c.id === activeChannelId);
    return { title: channel?.name, description: channel?.description, type: channel?.type };
  }, [activeChannelId, activeDMId, channels, teamMembers]);

  // Effects & Listeners
  const [messagesLimit, setMessagesLimit] = useState(30);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const updatePresence = async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid), { status: 'online', lastSeen: serverTimestamp() });
      } catch (err) { console.error(err); }
    };
    updatePresence();
    const interval = setInterval(updatePresence, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'channels'), (snap) => {
      if (snap.empty) {
        CHANNELS_DATA.forEach(c => addDoc(collection(db, 'channels'), { ...c, createdAt: serverTimestamp() }));
      } else {
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatRoom[];
        setChannels(docs);
        if (activeChannelId === '1' && !docs.find(c => c.id === '1')) setActiveChannelId(docs[0].id);
      }
      setIsLoadingChannels(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoadingTeam(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      setAllRecentMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ChatMessage[]);
    });
  }, [user?.uid]);

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    let q = activeDMId 
      ? query(messagesRef, where('participants', 'array-contains', user?.uid), orderBy('timestamp', 'desc'), limit(messagesLimit))
      : query(messagesRef, where('channelId', '==', activeChannelId), orderBy('timestamp', 'desc'), limit(messagesLimit));

    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      // Sort ascending for display after fetching descending for limit
      const sortedMsgs = [...msgs].sort((a,b) => {
        const t1 = a.timestamp?.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const t2 = b.timestamp?.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return t1 - t2;
      });

      if (activeDMId) {
        setMessages(sortedMsgs.filter(m => (m.senderId === user?.uid && m.recipientId === activeDMId) || (m.senderId === activeDMId && m.recipientId === user?.uid)));
      } else {
        setMessages(sortedMsgs);
      }
      setHasMoreMessages(snapshot.docs.length === messagesLimit);

      const activeId = activeDMId || activeChannelId;
      if (activeId && user?.uid) {
        const now = Date.now();
        setLastRead(prev => {
          const updated = { ...prev, [activeId]: now };
          localStorage.setItem(`chat_last_read_${user.uid}`, JSON.stringify(updated));
          return updated;
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'messages'));
  }, [activeChannelId, activeDMId, user?.uid, messagesLimit]);

  useEffect(() => {
    if (!giphySearch.trim()) { setGifs([]); return; }
    const fetchGifs = async () => {
      setIsSearchingGifs(true);
      try {
        const resp = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(giphySearch)}&limit=10`);
        const result = await resp.json();
        setGifs(result.data || []);
      } catch (err) { console.error(err); } finally { setIsSearchingGifs(false); }
    };
    const timeout = setTimeout(fetchGifs, 500);
    return () => clearTimeout(timeout);
  }, [giphySearch]);

  // Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const text = newMessage.trim();
    setNewMessage('');
    setShowMentionSuggestions(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    try {
      const msgData: any = {
        text,
        senderId: user.uid,
        senderName: user.displayName,
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        participants: activeDMId ? [user.uid, activeDMId] : [user.uid, ...(channels.find(c => c.id === activeChannelId)?.participants || [])]
      };
      if (!activeDMId) msgData.channelId = activeChannelId;
      else msgData.recipientId = activeDMId;

      await addDoc(collection(db, 'messages'), msgData);
      
      const mentionedUsers = teamMembers.filter(m => text.includes(`@${m.displayName}`));
      for (const m of mentionedUsers) {
        if (m.uid !== user.uid) {
          await createNotification({ title: 'New Mention', message: `${user.displayName} mentioned you`, type: 'info', userId: m.uid });
        }
      }
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'messages'); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !file.type.startsWith('image/')) return;
    try {
      const msgData = {
        text: `Sent an image: ${file.name}`,
        senderId: user.uid,
        senderName: user.displayName,
        attachments: [{ type: 'image', name: file.name, url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800' }],
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        ...(activeDMId ? { recipientId: activeDMId, participants: [user.uid, activeDMId] } : { channelId: activeChannelId, participants: [user.uid] })
      };
      await addDoc(collection(db, 'messages'), msgData);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'messages'); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setNewMessage(value);
    setCursorPosition(position);
    const parts = value.slice(0, position).split(/\s/);
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith('@')) {
      setMentionQuery(lastPart.slice(1).toLowerCase());
      setShowMentionSuggestions(true);
    } else { setShowMentionSuggestions(false); }
  };

  const handleSendGif = async (url: string) => {
    if (!user) return;
    try {
      const msgData = {
        text: 'Sent a GIF',
        senderId: user.uid,
        senderName: user.displayName,
        attachments: [{ type: 'image', url }],
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        ...(activeDMId ? { recipientId: activeDMId, participants: [user.uid, activeDMId] } : { channelId: activeChannelId, participants: [user.uid] })
      };
      await addDoc(collection(db, 'messages'), msgData);
      setShowGifPicker(false);
    } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'messages'); }
  };

  const isUserOnline = (member: any) => {
    if (member?.status !== 'online') return false;
    const lastSeenDate = member.lastSeen?.toDate ? member.lastSeen.toDate() : new Date(member.lastSeen);
    return lastSeenDate ? (Date.now() - lastSeenDate.getTime()) / 1000 < 120 : true;
  };

  const getUnreadCount = (roomId: string) => {
    const lastReadTime = lastRead[roomId] || 0;
    return allRecentMessages.filter(m => {
      const isForRoom = m.channelId === roomId || m.recipientId === roomId || (m.recipientId === user?.uid && m.senderId === roomId);
      if (!isForRoom || m.senderId === user?.uid) return false;
      const msgTime = m.timestamp?.toMillis ? m.timestamp.toMillis() : new Date(m.timestamp).getTime();
      return msgTime > lastReadTime;
    }).length;
  };

  const mentionSuggestions = useMemo(() => {
    return teamMembers.filter(m => 
      m.uid !== user?.uid && 
      (m.displayName || '').toLowerCase().includes(mentionQuery)
    );
  }, [teamMembers, user, mentionQuery]);

  const handleDeleteRoom = async () => {
    if (!activeChannelId || activeChannelId === '1') return;
    try {
      // 1. Delete all messages in the channel
      const q = query(collection(db, 'messages'), where('channelId', '==', activeChannelId));
      onSnapshot(q, (snap) => {
        snap.forEach(async (d) => {
          await deleteDoc(doc(db, 'messages', d.id));
        });
      });
      // 2. Delete the channel itself
      await deleteDoc(doc(db, 'channels', activeChannelId));
      setActiveChannelId('1');
      setActiveDMId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `channels/${activeChannelId}`);
    }
  };

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const canManage = user?.role === 'admin' || (activeChannel && (activeChannel as any).creatorId === user?.uid);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-white border border-border rounded-md overflow-hidden shadow-sm">
      <ChatSidebar 
        sidebarSearch={sidebarSearch} setSidebarSearch={setSidebarSearch}
        isLoadingChannels={isLoadingChannels} filteredChannels={filteredChannels}
        activeChannelId={activeChannelId} setActiveChannelId={setActiveChannelId}
        isLoadingTeam={isLoadingTeam} filteredTeamMembers={filteredTeamMembers}
        activeDMId={activeDMId} setActiveDMId={setActiveDMId}
        setIsCreateChannelModalOpen={setIsCreateChannelModalOpen}
        isUserOnline={isUserOnline} getUnreadCount={getUnreadCount}
      />

      <div className="flex-1 flex flex-col bg-white">
        <ChatHeader 
          roomInfo={roomInfo} isUserOnline={isUserOnline}
          showChatSearch={showChatSearch} setShowChatSearch={setShowChatSearch}
          chatSearch={chatSearch} setChatSearch={setChatSearch}
          canManage={canManage}
          onDeleteRoom={handleDeleteRoom}
        />

        <ChatMessages 
          messages={filteredMessages} chatSearch={chatSearch} 
          user={user} activeId={activeDMId || activeChannelId}
          roomType={roomInfo.type}
          teamMembers={teamMembers}
        />
        {hasMoreMessages && (
          <div className="absolute top-[60px] left-0 right-0 flex justify-center z-20 pointer-events-none">
            <button 
              onClick={() => setMessagesLimit(prev => prev + 30)}
              className="bg-white/80 backdrop-blur-sm border border-border px-4 py-1.5 rounded-full text-[10px] font-bold text-primary shadow-sm hover:bg-white transition-all pointer-events-auto mt-2"
            >
              Load Older Messages
            </button>
          </div>
        )}

        <ChatInput 
          newMessage={newMessage} setNewMessage={setNewMessage}
          handleInputChange={handleInputChange} handleSendMessage={handleSendMessage}
          handleFileUpload={handleFileUpload}
          showMentionSuggestions={showMentionSuggestions} mentionSuggestions={mentionSuggestions}
          selectMention={(member) => {
            const before = newMessage.slice(0, cursorPosition).replace(/@\w*$/, '');
            const after = newMessage.slice(cursorPosition);
            setNewMessage(`${before}@${member.displayName} ${after}`);
            setShowMentionSuggestions(false);
          }}
          showEmojiPicker={showEmojiPicker} setShowEmojiPicker={setShowEmojiPicker}
          showGifPicker={showGifPicker} setShowGifPicker={setShowGifPicker}
          giphySearch={giphySearch} setGiphySearch={setGiphySearch}
          isSearchingGifs={isSearchingGifs} gifs={gifs} handleSendGif={handleSendGif}
          activeDMId={activeDMId} roomTitle={roomInfo.title}
        />
      </div>

      <Modal isOpen={isCreateChannelModalOpen} onClose={() => setIsCreateChannelModalOpen(false)} title="Create New Channel">
        <div className="space-y-4">
          <Input label="Channel Name" value={newChannelData.name} onChange={(e) => setNewChannelData({ ...newChannelData, name: e.target.value })} placeholder="e.g. marketing-team" />
          <Input label="Description" value={newChannelData.description} onChange={(e) => setNewChannelData({ ...newChannelData, description: e.target.value })} placeholder="What's this channel about?" />
          <Select label="Type" value={newChannelData.type} onChange={(e) => setNewChannelData({ ...newChannelData, type: e.target.value })} options={[{ value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
          
          <div className="space-y-1.5">
            <label className="text-[12px] font-bold text-text-primary uppercase tracking-tight">Select Members</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border border-border rounded-md bg-bg-light/30 custom-scrollbar">
              {teamMembers.filter(m => m.uid !== user?.uid).map(member => (
                <div key={member.uid} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-all cursor-pointer" onClick={() => setSelectedMembers(prev => prev.includes(member.uid) ? prev.filter(id => id !== member.uid) : [...prev, member.uid])}>
                  <div className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center text-[10px] font-bold">{(member.displayName || '?').charAt(0)}</div>
                  <span className="text-[12px] text-text-primary truncate">{member.displayName}</span>
                  <input type="checkbox" checked={selectedMembers.includes(member.uid)} readOnly className="ml-auto rounded-sm border-border text-primary focus:ring-primary/20 w-3.5 h-3.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 pt-4 border-t border-border mt-4">
            <button onClick={() => setIsCreateChannelModalOpen(false)} className="px-5 py-2 text-[12px] font-bold text-text-secondary hover:text-text-primary uppercase">Cancel</button>
            <button onClick={async () => {
               if (!newChannelData.name || !user) return;
               setIsSubmittingChannel(true);
               try {
                 const participants = [user.uid, ...selectedMembers];
                 const docRef = await addDoc(collection(db, 'channels'), { ...newChannelData, participants, createdAt: serverTimestamp(), creatorId: user.uid });
                 setActiveChannelId(docRef.id);
                 setActiveDMId(null);
                 setIsCreateChannelModalOpen(false);
                 setNewChannelData({ name: '', description: '', type: 'public' });
                 setSelectedMembers([]);
               } catch (err) { handleFirestoreError(err, OperationType.CREATE, 'channels'); } finally { setIsSubmittingChannel(false); }
            }} disabled={isSubmittingChannel} className="px-6 py-2 bg-primary text-white rounded-md text-[12px] font-bold uppercase tracking-widest shadow-md hover:shadow-lg disabled:opacity-50">
              {isSubmittingChannel ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
