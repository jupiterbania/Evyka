import type { Photo } from '@/lib/types';
import imageData from '@/lib/placeholder-images.json';

const categories = ['Nature', 'Architecture', 'People', 'Abstract'];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomBool = (): boolean => Math.random() > 0.8;
const getRandomNumber = (max: number): number => Math.floor(Math.random() * max);

export const allPhotos: Photo[] = imageData.placeholderImages.map((img, index) => ({
  id: img.id,
  name: img.description,
  category: categories[index % categories.length],
  price: Math.floor(Math.random() * 90) + 10,
  imageUrl: img.imageUrl,
  imageHint: img.imageHint,
  isPurchased: getRandomBool(),
  popularity: getRandomNumber(1000),
  sales: getRandomNumber(200),
}));

export const photoSalesData = [
  { name: 'Jan', sales: getRandomNumber(100) },
  { name: 'Feb', sales: getRandomNumber(100) },
  { name: 'Mar', sales: getRandomNumber(100) },
  { name: 'Apr', sales: getRandomNumber(100) },
  { name: 'May', sales: getRandomNumber(100) },
  { name: 'Jun', sales: getRandomNumber(100) },
];

export const dashboardStats = {
  totalRevenue: allPhotos.reduce((acc, photo) => acc + photo.sales * photo.price, 0),
  totalSales: allPhotos.reduce((acc, photo) => acc + photo.sales, 0),
  totalImages: allPhotos.length,
  popularCategory: 'Nature',
};
