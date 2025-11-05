
'use client';
import { Header } from '@/components/header';
import { Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MessagesPage() {
  const isLoading = false; // Replace with actual loading state
  const conversations: any[] = []; // Replace with actual conversations

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Conversations...</p>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">No Messages Yet</h2>
          <p className="text-muted-foreground mt-2">
            When you start a new conversation, it will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Explore and Connect</Link>
          </Button>
        </div>
      );
    }
    
    return (
        <div>
            {/* Conversation list will go here */}
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-headline mb-6">Messages</h1>
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
