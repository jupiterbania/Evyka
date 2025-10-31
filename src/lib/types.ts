
import { Timestamp } from "firebase/firestore";

export type Image = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  blurredImageUrl: string;
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
}

export type Reply = {
    id: string;
    message: string;
    sentAt: Timestamp;
    isFromAdmin: boolean;
}

export type Message = {
    id: string;
    name: string;
    userId?: string;
    email?: string;
    message: string;
    isRead: boolean;
    createdAt: Timestamp;
    replies?: Reply[];
}
