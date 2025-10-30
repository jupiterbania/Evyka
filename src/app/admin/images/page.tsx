import { ImageManagement } from '@/components/image-management';

export default function AdminImagesPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Image Management</h1>
        <p className="text-muted-foreground">Upload, edit, and manage all images for your gallery.</p>
      </header>
      
      <ImageManagement />
    </div>
  );
}
