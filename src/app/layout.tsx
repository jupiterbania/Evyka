
import type { Metadata, ResolvingMetadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import Script from 'next/script';
import { AdScriptHead } from '@/components/ad-script-head';
import { AdScriptBody } from '@/components/ad-script-body';
import { AdBlockDetector } from '@/components/adblock-detector';
import { getDoc, doc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { SiteSettings } from '@/lib/types';

// Initialize a temporary, server-side Firebase instance to fetch settings
const getSettingsForMetadata = async (): Promise<SiteSettings | null> => {
  try {
    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }
    const db = getFirestore();
    const settingsRef = doc(db, 'settings', 'main');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      return settingsSnap.data() as SiteSettings;
    }
  } catch (error) {
    console.error("Could not fetch site settings for metadata:", error);
  }
  return null;
}

export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {
  const settings = await getSettingsForMetadata();
  const previousImages = (await parent).openGraph?.images || [];
  
  const openGraphImages = settings?.heroImageUrl 
    ? [settings.heroImageUrl, ...previousImages]
    : previousImages;

  return {
    title: 'EVYKA',
    description: 'See my exclusive premium pictures, videos & nudes.',
    manifest: '/manifest.json',
    openGraph: {
      images: openGraphImages,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="google-adsense-account" content="ca-pub-6434494026178547" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6434494026178547"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
        {/* AdScriptHead will be rendered inside the provider now */}
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <AdBlockDetector />
          <AdScriptHead />
          <FirebaseErrorListener />
          {children}
          <Toaster />
          <AdScriptBody />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
