import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  channelId?: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp | any;
  attachments?: { type: string, url: string, name?: string }[];
  readBy?: string[];
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'dm';
  projectId?: string;
  participants?: string[];
  creatorId?: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Timestamp | any;
}
