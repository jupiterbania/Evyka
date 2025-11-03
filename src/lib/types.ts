
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
