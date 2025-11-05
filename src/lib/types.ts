import { Timestamp } from "firebase/firestore";

export type Media = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  thumbnailUrl?: string; // For videos
  mediaType: 'image' | 'video';
  isNude?: boolean;
  isReel?: boolean; // To identify short-form vertical videos
  uploadDate: Timestamp;
  dominantColor?: string;
  authorId: string; // ID of the user who uploaded it - non-optional
  authorName?: string;
  authorPhotoUrl?: string;
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
  followerCount?: number;
  followingCount?: number;
}

export type Follow = {
  userId: string;
  followedAt: Timestamp;
}
