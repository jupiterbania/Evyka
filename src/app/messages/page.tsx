
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
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

  // A user only has one message thread, so we query for it.
  const userMessagesCollection = useMemoFirebase(
    () =>
      user
        ? collection(firestore, 'users', user.uid, 'messages')
        : null,
    [firestore, user]
  );

  const userMessageQuery = useMemoFirebase(
    () =>
      userMessagesCollection
        ? query(userMessagesCollection, orderBy('createdAt', 'desc'), limit(1))
        : null,
    [userMessagesCollection]
  );

  const { data: messages, isLoading: isMessagesLoading } = useCollection<Message>(userMessageQuery);
  
  // The user should only have one message document (thread).
  const userMessageThread = messages?.[0];

  // This query gets all the replies for that user's message thread.
  const repliesQuery = useMemoFirebase(
    () =>
      userMessageThread
        ? query(
            collection(firestore, 'users', user!.uid, 'messages', userMessageThread.id, 'replies'),
            orderBy('sentAt', 'asc')
          )
        : null,
    [firestore, userMessageThread, user]
  );
  const { data: replies, isLoading: isRepliesLoading } = useCollection<Reply>(repliesQuery);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [replies, userMessageThread]);


  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !userMessagesCollection) return;
    setIsSending(true);

    try {
      const now = serverTimestamp();
      const lastMessageSnippet = messageText.substring(0, 100);

      // If there's no existing message thread, create one.
      if (!userMessageThread) {
        const newMessage: Omit<Message, 'id'> = {
            firstMessage: messageText,
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'New User',
            createdAt: now as any,
            isRead: false,
            lastReplyAt: now as any,
            lastMessageSnippet,
        };
        await addDocumentNonBlocking(userMessagesCollection, newMessage);
      } else {
        // If a thread exists, add the new message as a reply and update the parent thread doc.
        const threadDocRef = doc(firestore, 'users', user.uid, 'messages', userMessageThread.id);
        const repliesCollection = collection(threadDocRef, 'replies');
        
        const newReply: Omit<Reply, 'id'> = {
            message: messageText,
            sentAt: now as any,
            isFromAdmin: false, // This is a user's reply
        };
        addDocumentNonBlocking(repliesCollection, newReply);

        // Update the parent thread with last reply info
        updateDocumentNonBlocking(threadDocRef, {
          isRead: false, // Mark as unread for the admin
          lastReplyAt: now,
          lastMessageSnippet,
        });
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
  
  const isLoading = isUserLoading || isMessagesLoading;

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

  const allReplies = replies ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto border rounded-lg flex flex-col h-[75vh] bg-card">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold font-headline">Your Conversation with Admin</h1>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {userMessageThread ? (
              <>
                {/* Initial Message */}
                <div className="flex flex-col items-start">
                  <div className={cn('rounded-lg p-3 max-w-lg shadow-sm', 'bg-background')}>
                    <p className="text-sm">{userMessageThread?.firstMessage}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {userMessageThread?.createdAt &&
                      formatDistanceToNow(userMessageThread.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </div>

                {/* Replies */}
                {isRepliesLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : allReplies.map((reply) => (
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
