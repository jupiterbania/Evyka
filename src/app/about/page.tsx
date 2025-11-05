
import { Header } from '@/components/header';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold font-headline mb-4">About Us</h1>
          <div className="space-y-6 text-lg text-muted-foreground">
            <p>
              Welcome to EVYKA, your premier destination for exclusive, high-quality visual content.
            </p>
            <p>
              Our platform is dedicated to showcasing a curated collection of images and videos from talented creators and cutting-edge AI. We believe in the power of visual storytelling and aim to provide a space where creativity knows no bounds.
            </p>
            <p>
              Whether you are here to browse, get inspired, or find that perfect piece of media, we are thrilled to have you as part of our community. Explore our galleries and immerse yourself in a world of stunning visuals.
            </p>
            <p>
              All content on this site is AI-generated and intended for entertainment purposes only.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
