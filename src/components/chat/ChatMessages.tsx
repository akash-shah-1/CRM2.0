import { useEffect, useRef } from 'react';
import { Send, Search, Check, CheckCheck } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ChatMessage } from './types';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface ChatMessagesProps {
  messages: ChatMessage[];
  chatSearch: string;
  user: any;
  activeId: string;
  roomType: 'dm' | 'channel' | string;
  teamMembers: any[];
}

export default function ChatMessages({ messages, chatSearch, user, activeId, roomType, teamMembers }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;
    
    const unreadMessages = messages.filter(m => m.senderId !== user.uid && !m.readBy?.includes(user.uid));
    
    unreadMessages.forEach(async (m) => {
      try {
        await updateDoc(doc(db, 'messages', m.id), {
          readBy: arrayUnion(user.uid)
        });
      } catch (err) {
        // Silently fail if rules catch it late, but we updated rules to allow this
        console.error('Error marking message as read:', err);
      }
    });
  }, [messages, user?.uid]);

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const member = teamMembers.find(m => (m.displayName || m.name) === name);
        if (member) {
          return <span key={i} className="text-white font-bold bg-white/20 px-1 rounded mx-0.5">@{name}</span>
        }
      }
      return part;
    });
  };

  const renderTextReceiver = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const member = teamMembers.find(m => (m.displayName || m.name) === name);
        if (member) {
          return <span key={i} className="text-primary font-bold bg-primary/10 px-1 rounded mx-0.5">@{name}</span>
        }
      }
      return part;
    });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-bg-light/10 custom-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
          <div className="w-20 h-20 rounded-md bg-bg-light flex items-center justify-center border border-border mb-4">
            {chatSearch ? <Search size={40} className="text-primary/30" /> : <Send size={40} className="text-primary/30 -translate-x-1 translate-y-1" />}
          </div>
          <p className="text-[14px] font-bold text-text-primary">
            {chatSearch ? 'No messages found' : 'New Conversation'}
          </p>
          <p className="text-[12px] mt-1 font-medium text-center max-w-[200px]">
            {chatSearch ? `No matches for "${chatSearch}" in this room.` : 'Send a message to get things started!'}
          </p>
        </div>
      ) : (
        messages.map((msg, i) => {
          const isOwn = msg.senderId === user?.uid;
          const prevMsg = messages[i - 1];
          const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;
          
          // Improved read status
          const readByOthers = msg.readBy?.filter(id => id !== msg.senderId) || [];
          const isRead = readByOthers.length > 0;

          return (
            <div key={msg.id} className={cn(
              "flex gap-4",
              isOwn ? "flex-row-reverse" : "flex-row",
              !showHeader && "-mt-4"
            )}>
              {showHeader ? (
                <div className="w-9 h-9 rounded-md bg-bg-light flex items-center justify-center text-[10px] font-bold text-text-primary shrink-0 border border-border font-mono relative">
                  {msg.senderName?.charAt(0) || '?'}
                  {!isOwn && roomType !== 'dm' && (
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-white shadow-sm" />
                  )}
                </div>
              ) : (
                <div className="w-9 shrink-0" />
              )}
              <div className={cn(
                "flex flex-col max-w-[70%]",
                isOwn ? "items-end" : "items-start"
              )}>
                {showHeader && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[12px] font-bold text-text-primary">{msg.senderName}</span>
                  </div>
                )}
                <div className="group relative flex flex-col">
                  <div className={cn(
                    "px-4 py-3 text-[13.5px] font-medium shadow-sm transition-all relative break-words",
                    isOwn 
                      ? "bg-primary text-white rounded-md rounded-tr-none shadow-primary/10" 
                      : "bg-white text-text-primary border border-border rounded-md rounded-tl-none shadow-black/[0.02]",
                    !showHeader && (isOwn ? "rounded-tr-md" : "rounded-tl-md")
                  )}>
                    {isOwn ? renderText(msg.text) : renderTextReceiver(msg.text)}
                    {msg.attachments?.map((att, idx) => (
                      <div key={idx} className="mt-3 rounded-md overflow-hidden border border-border/20 shadow-sm first:mt-2">
                        {att.type === 'image' && <img src={att.url} alt="Attachment" className="max-w-full h-auto block" />}
                      </div>
                    ))}
                  </div>
                  
                  {/* Footer with time and read status */}
                  <div className={cn(
                    "flex items-center gap-1.5 mt-1 px-1 min-h-[16px]",
                    isOwn ? "justify-end" : "justify-start"
                  )}>
                    <span className="text-[10px] text-text-secondary font-bold uppercase">
                      {formatMessageTime(msg.timestamp)}
                    </span>
                    
                    {isOwn && (
                      <div className="flex items-center gap-1">
                        {roomType === 'dm' ? (
                          isRead ? (
                            <CheckCheck size={12} className="text-primary animate-in fade-in" />
                          ) : (
                            <Check size={12} className="text-text-secondary/30" />
                          )
                        ) : (
                          readByOthers.length > 0 && (
                            <div className="flex -space-x-1 items-center ml-1">
                              {readByOthers.slice(0, 3).map(uid => {
                                const m = teamMembers.find(member => member.uid === uid);
                                return (
                                  <div key={uid} className="w-3.5 h-3.5 rounded-full bg-white border border-border flex items-center justify-center text-[6px] font-bold text-primary overflow-hidden shadow-sm" title={m?.displayName}>
                                    {m?.displayName?.charAt(0) || '?'}
                                  </div>
                                );
                              })}
                              {readByOthers.length > 3 && (
                                <div className="text-[7px] text-text-secondary font-bold pl-1">
                                  +{readByOthers.length - 3}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {!isOwn && roomType !== 'dm' && readByOthers.length > 1 && (
                      <div className="flex -space-x-1 items-center">
                         {readByOthers.slice(0, 3).map(uid => {
                            const m = teamMembers.find(member => member.uid === uid);
                            return (
                              <div key={uid} className="w-3.5 h-3.5 rounded-full bg-white border border-border flex items-center justify-center text-[6px] font-bold text-text-secondary overflow-hidden" title={m?.displayName}>
                                {m?.displayName?.charAt(0) || '?'}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
