
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking,
  useFirebase
} from '@/firebase';

import type { Message, Reply } from '@/lib/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserMessagesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Redirect if user is not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  // This query finds the user's single message thread.
  const userMessageQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'messages'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'))
        : null,
    [firestore, user]
  );
  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(userMessageQuery);
  
  // The user should only have one message document.
  const userMessage = messages?.[0];

  // This query gets all the replies for that user's message thread.
  const repliesQuery = useMemoFirebase(
    () =>
      userMessage
        ? query(
            collection(firestore, 'messages', userMessage.id, 'replies'),
            orderBy('sentAt', 'asc')
          )
        : null,
    [firestore, userMessage]
  );
  const { data: replies, isLoading: isRepliesLoading } = useCollection<Reply>(repliesQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [replies, userMessage]);


  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;
    setIsSending(true);

    try {
      // If there's no existing message thread, create one first.
      if (!userMessage) {
        const messagesCollection = collection(firestore, 'messages');
        const newMessage: Omit<Message, 'id'> = {
            message: messageText,
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'New User',
            createdAt: serverTimestamp() as any,
            isRead: false,
        };
        await addDocumentNonBlocking(messagesCollection, newMessage);
        // We don't add to the replies subcollection here, because the initial message is the thread itself.
      } else {
        // If a thread exists, just add the new message as a reply.
        const repliesCollection = collection(firestore, 'messages', userMessage.id, 'replies');
        const newReply: Omit<Reply, 'id'> = {
            message: messageText,
            sentAt: serverTimestamp() as any,
            isFromAdmin: false, // This is a user's reply
        };
        addDocumentNonBlocking(repliesCollection, newReply);
      }
      
      setMessageText('');
    } catch (error: any) {
      console.error("Error sending message: ", error);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: error.message || 'Could not send your message.',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const isLoading = isUserLoading || isMessagesLoading || isRepliesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto border rounded-lg flex flex-col h-[75vh] bg-card">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold font-headline">Your Conversation with Admin</h1>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {userMessage ? (
              <>
                {/* Initial Message */}
                <div className="flex flex-col items-start">
                  <div className={cn('rounded-lg p-3 max-w-lg shadow-sm', 'bg-background')}>
                    <p className="text-sm">{userMessage?.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {userMessage?.createdAt &&
                      formatDistanceToNow(userMessage.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </div>

                {/* Replies */}
                {replies?.map((reply) => (
                  <div
                    key={reply.id}
                    className={cn(
                      'flex flex-col',
                      !reply.isFromAdmin ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'rounded-lg p-3 max-w-lg shadow-sm',
                        !reply.isFromAdmin
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background'
                      )}
                    >
                      <p className="text-sm">{reply.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">
                      {reply.sentAt && formatDistanceToNow(reply.sentAt.toDate(), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </>
            ) : (
               <div className="text-center text-muted-foreground flex-grow flex items-center justify-center">
                   <p>Send a message to start the conversation.</p>
               </div>
            )}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-background/80">
            <div className="flex w-full gap-2 items-center">
              <Textarea
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-grow"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()} size="icon" className="shrink-0">
                {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
