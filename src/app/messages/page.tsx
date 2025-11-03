
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  limit,
  writeBatch
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  useUser,
} from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { uploadMedia } from '@/ai/flows/upload-media-flow';


import type { Message, Reply } from '@/lib/types';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Send, Loader2, Image as ImageIcon, X, Clock, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UserMessagesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [optimisticReplies, setOptimisticReplies] = useState<Reply[]>([]);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);


  // Redirect if user is not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  // A user only has one message thread, so we query for it.
  const userMessagesCollection = useMemoFirebase(
    () =>
      firestore && user
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
      firestore && user && userMessageThread
        ? query(
            collection(firestore, 'users', user.uid, 'messages', userMessageThread.id, 'replies'),
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
  }, [replies, userMessageThread, optimisticReplies]);
  
  // Logic to mark admin messages as read
  useEffect(() => {
    if (replies && firestore && user && userMessageThread) {
        const unreadAdminReplies = replies.filter(r => r.isFromAdmin && !r.isRead);
        if (unreadAdminReplies.length > 0) {
            const batch = writeBatch(firestore);
            unreadAdminReplies.forEach(reply => {
                const replyRef = doc(firestore, 'users', user.uid, 'messages', userMessageThread.id, 'replies', reply.id);
                batch.update(replyRef, { isRead: true });
            });
            batch.commit().catch(err => console.error("Error marking replies as read: ", err));
        }
    }
  }, [replies, firestore, user, userMessageThread]);


  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const resetInput = () => {
    setMessageText('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !imageFile) || !user || !firestore || !userMessagesCollection) return;
    
    setIsSending(true);
    const optimisticId = uuidv4();
    const now = new Date();

    // Create an optimistic object for immediate UI feedback.
    // If it's a new thread, this will act as the first message.
    // If it's a reply, it's a standard optimistic reply.
    const optimisticMessage: Reply = {
      id: optimisticId,
      message: messageText,
      sentAt: now as any,
      isFromAdmin: false,
      isRead: false,
      status: 'sending',
      localImagePreviewUrl: imagePreview ?? undefined,
    };
    
    // Add to optimistic replies regardless of whether it's a new thread or a reply.
    setOptimisticReplies(prev => [...prev, optimisticMessage]);
    resetInput();
    scrollToBottom();


    try {
      let finalImageUrl: string | undefined = undefined;

      if (imageFile) {
        const reader = await new Promise<string>((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.readAsDataURL(imageFile);
          fileReader.onload = () => resolve(fileReader.result as string);
          fileReader.onerror = (error) => reject(error);
        });
        const uploadResult = await uploadMedia({ mediaDataUri: reader });
        if (!uploadResult || !uploadResult.mediaUrl) {
          throw new Error('Image upload failed to return a URL.');
        }
        finalImageUrl = uploadResult.mediaUrl;
      }
      
      const serverTime = serverTimestamp();
      const lastMessageSnippet = finalImageUrl ? '📷 Image' : messageText.substring(0, 100);

      if (!userMessageThread) {
        // This is the first message of a new thread.
        const newMessage: Omit<Message, 'id'> = {
            firstMessage: messageText,
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'New User',
            createdAt: serverTime as any,
            isRead: false,
            lastReplyAt: serverTime as any,
            lastMessageSnippet,
            imageUrl: finalImageUrl,
        };

        const newDocRef = await addDocumentNonBlocking(userMessagesCollection, newMessage);
        // The listener will pick up the new thread, and the optimistic message will be discarded
        // because the main message thread now exists and will be rendered.
        // We can remove the optimistic message once the thread is created.
        if (newDocRef) {
          setOptimisticReplies(prev => prev.filter(r => r.id !== optimisticId));
        }

      } else {
        // This is a reply to an existing thread.
        const threadDocRef = doc(firestore, 'users', user.uid, 'messages', userMessageThread.id);
        const repliesCollectionRef = collection(threadDocRef, 'replies');
        
        const newReply: Omit<Reply, 'id' | 'status' | 'localImagePreviewUrl'> = {
            message: messageText,
            sentAt: serverTime as any,
            isFromAdmin: false,
            isRead: false,
            imageUrl: finalImageUrl,
        };
        addDocumentNonBlocking(repliesCollectionRef, newReply);

        updateDocumentNonBlocking(threadDocRef, {
          isRead: false,
          lastReplyAt: serverTime,
          lastMessageSnippet,
        });

        // Update optimistic reply to 'sent'
        setOptimisticReplies(prev => prev.map(r => r.id === optimisticId ? { ...r, status: 'sent' } : r));
      }

    } catch (error: any) {
      console.error("Error sending message: ", error);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: error.message || 'Could not send your message.',
      });
      // Update optimistic reply to 'error'
      setOptimisticReplies(prev => prev.map(r => r.id === optimisticId ? { ...r, status: 'error' } : r));
    } finally {
      setIsSending(false);
    }
  };
  
  const isLoading = isUserLoading || isMessagesLoading;
  
  const allReplies = useMemo(() => {
    // If there's no main message thread yet, optimistic replies are the only thing to show.
    if (!userMessageThread) {
      return optimisticReplies;
    }
  
    // Otherwise, combine the persisted replies with the optimistic ones.
    const combined = [...(replies || [])];
    optimisticReplies.forEach(optimistic => {
        if (!combined.find(r => r.id === optimistic.id)) {
            combined.push(optimistic);
        }
    });
    return combined.sort((a, b) => {
        const timeA = a.sentAt instanceof Date ? a.sentAt.getTime() : a.sentAt?.toMillis() || 0;
        const timeB = b.sentAt instanceof Date ? b.sentAt.getTime() : b.sentAt?.toMillis() || 0;
        return timeA - timeB;
    });
  }, [replies, optimisticReplies, userMessageThread]);

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


  const renderStatusIcon = (reply: Reply) => {
    if (reply.isFromAdmin) return null; // Only show for user's messages

    if (reply.status === 'error') {
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (reply.status === 'sending') {
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
    // Check if the overall thread is read by admin, apply to all user messages
    if (userMessageThread?.isRead) {
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    
    // `sent` status or default for persisted messages
    return <Check className="h-4 w-4 text-muted-foreground" />;
}


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-3xl mx-auto border rounded-lg flex flex-col h-[75vh] bg-card w-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold font-headline">Send personal to Eveyka</h1>
          </div>
          
          <ScrollArea className="flex-grow">
            <div className="p-4 space-y-4">
              {userMessageThread ? (
                <>
                  {/* Initial Message */}
                  <div className="flex items-end gap-2" onClick={() => setSelectedTimestamp(userMessageThread.id)}>
                      <div className={cn('rounded-lg p-2 max-w-lg shadow-sm', 'bg-background')}>
                           {userMessageThread.imageUrl && (
                              <Dialog>
                                  <DialogTrigger>
                                      <Image src={userMessageThread.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md mb-2 max-w-[200px] h-auto cursor-pointer" />
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] p-0">
                                      <DialogTitle className="sr-only">Enlarged image view</DialogTitle>
                                      <Image src={userMessageThread.imageUrl} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                  </DialogContent>
                              </Dialog>
                           )}
                          {userMessageThread.firstMessage && <p className="text-sm break-words px-1 pb-1">{userMessageThread.firstMessage}</p>}
                      </div>
                  </div>
                  {selectedTimestamp === userMessageThread.id && userMessageThread.createdAt && (
                    <div className="flex items-end gap-2">
                      <span className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(userMessageThread.createdAt.toDate(), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {/* Replies */}
                  {isRepliesLoading && !allReplies.length ? (
                      <div className="flex justify-center items-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                  ) : allReplies.map((reply) => (
                    <div key={reply.id} onClick={() => setSelectedTimestamp(reply.id)}>
                      <div
                        className={cn(
                          'flex items-end gap-2',
                          !reply.isFromAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg p-2 max-w-lg shadow-sm flex flex-col',
                            !reply.isFromAdmin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background'
                          )}
                        >
                          {(reply.imageUrl || reply.localImagePreviewUrl) && (
                            <div className="relative mb-1">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="relative">
                                            <Image 
                                                src={reply.localImagePreviewUrl || reply.imageUrl!} 
                                                alt="Sent image" 
                                                width={200} 
                                                height={200} 
                                                className={cn("rounded-md max-w-[200px] h-auto cursor-pointer", reply.status === 'sending' && 'opacity-50')}
                                            />
                                            {reply.status === 'sending' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] p-0">
                                      <DialogTitle className="sr-only">Enlarged image view</DialogTitle>
                                        <Image src={reply.localImagePreviewUrl || reply.imageUrl!} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                    </DialogContent>
                                </Dialog>
                            </div>
                          )}
                          {reply.message && <p className="text-sm break-words px-1 pb-1">{reply.message}</p>}
                        </div>
                      </div>
                      {selectedTimestamp === reply.id && reply.sentAt && (
                          <div className={cn("flex items-center gap-1 mt-1", !reply.isFromAdmin ? 'justify-end' : 'justify-start')}>
                             <span className="text-xs text-muted-foreground">
                                {reply.sentAt && formatDistanceToNow(reply.sentAt instanceof Date ? reply.sentAt : reply.sentAt.toDate(), { addSuffix: true })}
                             </span>
                             {renderStatusIcon(reply)}
                          </div>
                      )}
                    </div>
                  ))}
                </>
              ) : allReplies.length > 0 ? (
                 allReplies.map((reply) => (
                    <div key={reply.id} onClick={() => setSelectedTimestamp(reply.id)}>
                      <div
                        className={cn(
                          'flex items-end gap-2',
                          !reply.isFromAdmin ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg p-2 max-w-lg shadow-sm flex flex-col',
                            !reply.isFromAdmin
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background'
                          )}
                        >
                          {(reply.imageUrl || reply.localImagePreviewUrl) && (
                            <div className="relative mb-1">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <div className="relative">
                                            <Image 
                                                src={reply.localImagePreviewUrl || reply.imageUrl!} 
                                                alt="Sent image" 
                                                width={200} 
                                                height={200} 
                                                className={cn("rounded-md max-w-[200px] h-auto cursor-pointer", reply.status === 'sending' && 'opacity-50')}
                                            />
                                            {reply.status === 'sending' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                                                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] p-0">
                                      <DialogTitle className="sr-only">Enlarged image view</DialogTitle>
                                        <Image src={reply.localImagePreviewUrl || reply.imageUrl!} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                    </DialogContent>
                                </Dialog>
                            </div>
                          )}
                          {reply.message && <p className="text-sm break-words px-1 pb-1">{reply.message}</p>}
                        </div>
                      </div>
                      {selectedTimestamp === reply.id && reply.sentAt && (
                          <div className={cn("flex items-center gap-1 mt-1", !reply.isFromAdmin ? 'justify-end' : 'justify-start')}>
                             <span className="text-xs text-muted-foreground">
                                {reply.sentAt && formatDistanceToNow(reply.sentAt instanceof Date ? reply.sentAt : reply.sentAt.toDate(), { addSuffix: true })}
                             </span>
                             {renderStatusIcon(reply)}
                          </div>
                      )}
                    </div>
                 ))
              ) : (
                 <div className="text-center text-muted-foreground flex-grow flex items-center justify-center">
                     <p>Send a message to start the conversation.</p>
                 </div>
              )}
               <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-background">
             {imagePreview && (
                <div className="relative w-24 h-24 mb-2">
                    <Image src={imagePreview} alt="Image preview" layout="fill" className="object-cover rounded-md" />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            if(fileInputRef.current) fileInputRef.current.value = '';
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
             )}
            <div className="flex w-full gap-2 items-start">
              <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                  className="hidden"
              />
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                  <ImageIcon />
                  <span className="sr-only">Upload Image</span>
              </Button>
              <Textarea
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-grow"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
              />
              <Button onClick={handleSendMessage} disabled={isSending || (!messageText.trim() && !imageFile)} size="icon" className="shrink-0">
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
