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
};

export type Purchase = {
    id: string;
    userId?: string;
    imageId: string;
    purchaseDate: Timestamp;
    price: number;
}

export type Analytics = {
    id?: string;
    totalRevenue: number;
    totalSales: number;
    monthlySales: {
        [key: string]: number;
    };
}

export type SiteSettings = {
    id?: string;
    heroImageUrl?: string;
    heroImageHint?: string;
}
