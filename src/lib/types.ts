import { Timestamp } from "firebase/firestore";

export type Image = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  blurredImageUrl: string;
  price: number;
  uploadDate: Timestamp;
  sales: number;
  dominantColor?: string;
};

export type Purchase = {
    id: string;
    userId?: string;
    imageId: string;
    purchaseDate: Timestamp;
    price: number;
}

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
