import type { Photo } from '@/lib/types';
import imageData from '@/lib/placeholder-images.json';

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomBool = (): boolean => Math.random() > 0.8;
const getRandomNumber = (max: number): number => Math.floor(Math.random() * max);

export const generateAllPhotos = (): Photo[] => {
  return imageData.placeholderImages.map((img, index) => ({
    id: img.id,
    name: img.description,
    price: Math.floor(Math.random() * 90) + 10,
    imageUrl: img.imageUrl,
    imageHint: img.imageHint,
    isPurchased: getRandomBool(),
    popularity: getRandomNumber(1000),
    sales: getRandomNumber(200),
  }));
};

export const allPhotos: Photo[] = imageData.placeholderImages.map((img, index) => ({
  id: img.id,
  name: img.description,
  price: 50, // Default price
  imageUrl: img.imageUrl,
  imageHint: img.imageHint,
  isPurchased: false,
  popularity: 0,
  sales: 0,
}));


export const generatePhotoSalesData = () => [
  { name: 'Jan', sales: getRandomNumber(100) },
  { name: 'Feb', sales: getRandomNumber(100) },
  { name: 'Mar', sales: getRandomNumber(100) },
  { name: 'Apr', sales: getRandomNumber(100) },
  { name: 'May', sales: getRandomNumber(100) },
  { name: 'Jun', sales: getRandomNumber(100) },
];

export const photoSalesData = [
    { name: 'Jan', sales: 0 },
    { name: 'Feb', sales: 0 },
    { name: 'Mar', sales: 0 },
    { name: 'Apr', sales: 0 },
    { name: 'May', sales: 0 },
    { name: 'Jun', sales: 0 },
];

export const generateDashboardStats = (photos: Photo[]) => ({
  totalRevenue: photos.reduce((acc, photo) => acc + photo.sales * photo.price, 0),
  totalSales: photos.reduce((acc, photo) => acc + photo.sales, 0),
  totalImages: photos.length,
});

export const dashboardStats = {
  totalRevenue: 0,
  totalSales: 0,
  totalImages: 0,
};
