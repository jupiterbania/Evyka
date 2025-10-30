import { ImageManagement } from '@/components/image-management';

export default function AdminImagesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Image Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Upload, edit, and manage all images for your gallery.</p>
      </header>
      
      <ImageManagement />
    </div>
  );
}
