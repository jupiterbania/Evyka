
import { Timestamp } from "firebase/firestore";

export type Media = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl?: string; // For videos
  mediaType: 'image' | 'video';
  isNude?: boolean;
  uploadDate: Timestamp;
  dominantColor?: string;
};

export type SiteSettings = {
    id?: string;
    heroImageUrl?: string;
    heroImageHint?: string;
}

export type User = {
  id: string;
  email: string;
  username: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
  createdAt: Timestamp;
}

export type Message = {
    id: string;
    name: string;
    email: string;
    userId: string;
    firstMessage?: string;
    imageUrl?: string;
    createdAt: Timestamp;
    isRead: boolean;
    lastReplyAt: Timestamp;
    lastMessageSnippet: string;
}

export type Reply = {
    id: string;
    message?: string;
    imageUrl?: string;
    sentAt: Timestamp;
    isFromAdmin: boolean;
}
