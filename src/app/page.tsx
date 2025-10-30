import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ImageCard } from '@/components/image-card';
import { allPhotos } from '@/lib/placeholder-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <section className="w-full py-24 bg-card">
          <div className="container px-4">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tighter font-headline">
                  Welcome to EVYKA
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground text-lg">
                  Discover and purchase unique, high-quality images from talented photographers around the world.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section id="gallery" className="py-12">
          <div className="container">
            <div className="flex flex-col items-center justify-between mb-8 gap-4">
              <h2 className="text-3xl font-bold tracking-tight font-headline">Explore Gallery</h2>
               <div className="flex items-center gap-4">
                 <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                      <SelectItem value="architecture">Architecture</SelectItem>
                      <SelectItem value="people">People</SelectItem>
                      <SelectItem value="abstract">Abstract</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {allPhotos.map((photo) => (
                <ImageCard key={photo.id} photo={photo} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
