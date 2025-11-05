
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import {
  doc,
  collection,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Conversation, Message, User as AppUser } from '@/lib/types';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const conversationId = Array.isArray(id) ? id[0] : id;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newMessage, setNewMessage] = useState('');

  const conversationRef = useMemoFirebase(
    () => (firestore && conversationId ? doc(firestore, 'conversations', conversationId) : null),
    [firestore, conversationId]
  );
  const { data: conversation, isLoading: isConversationLoading } = useDoc<Conversation>(conversationRef);

  const messagesQuery = useMemoFirebase(
    () =>
      firestore && conversationId
        ? query(collection(firestore, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'))
        : null,
    [firestore, conversationId]
  );
  const { data: messages, isLoading: areMessagesLoading } = useCollection<Message>(messagesQuery);
  
  const otherParticipant = conversation?.participantInfo.find(p => p.userId !== currentUser?.uid);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !firestore || !conversationId) return;

    const messagesColRef = collection(firestore, 'conversations', conversationId, 'messages');
    
    addDocumentNonBlocking(messagesColRef, {
      senderId: currentUser.uid,
      text: newMessage.trim(),
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    updateDocumentNonBlocking(conversationRef!, {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: currentUser.uid,
    });

    setNewMessage('');
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };
  
  if (isUserLoading || isConversationLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }
  
  if (!conversation) {
    return (
       <div className="flex h-screen flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-4">Conversation not found.</h2>
        <p className="text-muted-foreground mb-6">It might have been deleted or you may not have permission to view it.</p>
        <Button asChild>
            <Link href="/messages">Back to Messages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {otherParticipant && (
            <Link href={`/profile/${otherParticipant.userId}`} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherParticipant.profileImageUrl} />
                <AvatarFallback>{getInitials(otherParticipant.username)}</AvatarFallback>
              </Avatar>
              <h2 className="font-semibold">{otherParticipant.username}</h2>
            </Link>
        )}
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        {areMessagesLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>}
        {messages?.map((message) => {
           const isSender = message.senderId === currentUser?.uid;
           const messageParticipant = isSender ? null : conversation?.participantInfo.find(p => p.userId === message.senderId);

          return (
            <div
              key={message.id}
              className={cn('flex items-end gap-2', isSender ? 'justify-end' : 'justify-start')}
            >
              {!isSender && (
                 <Avatar className="h-8 w-8">
                    <AvatarImage src={messageParticipant?.profileImageUrl} />
                    <AvatarFallback>{getInitials(messageParticipant?.username)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs rounded-lg px-4 py-2 text-sm sm:max-w-md md:max-w-lg',
                  isSender ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 border-t bg-background p-2">
        <form onSubmit={handleSendMessage} className="container flex items-center gap-2 px-4">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </footer>
    </div>
  );
}
