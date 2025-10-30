import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { AgeGate } from '@/components/age-gate';

export const metadata: Metadata = {
  title: 'EVYKA',
  description: 'Discover and purchase unique, high-quality images from talented photographers around the world.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <AgeGate>
            {children}
          </AgeGate>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
