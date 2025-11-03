'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { Send, Loader2, Image as ImageIcon, X, Check, Clock, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

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
  const [viewingImage, setViewingImage] = useState<string | null>(null);
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

    const optimisticReply: Reply = {
      id: optimisticId,
      message: messageText,
      sentAt: now as any, // Temporary client-side date
      isFromAdmin: false,
      status: 'sending',
      localImagePreviewUrl: imagePreview ?? undefined,
    };
    
    setOptimisticReplies(prev => [...prev, optimisticReply]);
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
        const newMessage: Omit<Message, 'id'> = {
            firstMessage: messageText,
            imageUrl: finalImageUrl,
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'New User',
            createdAt: serverTime as any,
            isRead: false,
            lastReplyAt: serverTime as any,
            lastMessageSnippet,
        };
        await addDocumentNonBlocking(userMessagesCollection, newMessage);
      } else {
        const threadDocRef = doc(firestore, 'users', user.uid, 'messages', userMessageThread.id);
        const repliesCollectionRef = collection(threadDocRef, 'replies');
        
        const newReply: Omit<Reply, 'id' | 'status' | 'localImagePreviewUrl'> = {
            message: messageText,
            imageUrl: finalImageUrl,
            sentAt: serverTime as any,
            isFromAdmin: false,
        };
        addDocumentNonBlocking(repliesCollectionRef, newReply);

        updateDocumentNonBlocking(threadDocRef, {
          isRead: false,
          lastReplyAt: serverTime,
          lastMessageSnippet,
        });
      }

      // Update optimistic reply to 'sent'
      setOptimisticReplies(prev => prev.map(r => r.id === optimisticId ? { ...r, status: 'sent' } : r));

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
  }, [replies, optimisticReplies]);

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

    switch (reply.status) {
        case 'sending':
            return <Clock className="h-3 w-3 text-muted-foreground" />;
        case 'sent':
            return <Check className="h-4 w-4 text-primary" />;
        case 'error':
            return <AlertTriangle className="h-4 w-4 text-destructive" />;
        default:
            // For real messages from Firestore that don't have a status
            return <Check className="h-4 w-4 text-primary" />;
    }
}


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-3xl mx-auto border rounded-lg flex flex-col h-[75vh] bg-card w-full">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold font-headline">Send personal to Eveyka</h1>
          </div>
          
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {userMessageThread ? (
              <>
                {/* Initial Message */}
                <div className="flex flex-col items-start" onClick={() => setSelectedTimestamp(userMessageThread.id)}>
                    <div className={cn('rounded-lg p-3 max-w-lg shadow-sm', 'bg-background')}>
                         {userMessageThread.imageUrl && (
                            <Dialog>
                                <DialogTrigger>
                                    <Image src={userMessageThread.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md mb-2 max-w-[200px] h-auto cursor-pointer" />
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] p-0">
                                    <Image src={userMessageThread.imageUrl} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                </DialogContent>
                            </Dialog>
                         )}
                        {userMessageThread.firstMessage && <p className="text-sm break-words px-1 pb-1">{userMessageThread.firstMessage}</p>}
                    </div>
                  {selectedTimestamp === userMessageThread.id && userMessageThread.createdAt && (
                    <span className="text-xs text-muted-foreground mt-1 self-start">
                        {formatDistanceToNow(userMessageThread.createdAt.toDate(), { addSuffix: true })}
                    </span>
                  )}
                </div>

                {/* Replies */}
                {isRepliesLoading && !allReplies.length ? (
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
                    onClick={() => setSelectedTimestamp(reply.id)}
                  >
                    <div
                      className={cn(
                        'rounded-lg p-2 max-w-lg shadow-sm relative',
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
                                    <Image src={reply.localImagePreviewUrl || reply.imageUrl!} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                </DialogContent>
                            </Dialog>
                        </div>
                      )}
                      {reply.message && <p className="text-sm break-words px-1 pb-4">{reply.message}</p>}
                      <div className="absolute bottom-1 right-2 flex items-center gap-1">
                        {renderStatusIcon(reply)}
                      </div>
                    </div>
                    {selectedTimestamp === reply.id && reply.sentAt && (
                        <span className={cn("text-xs text-muted-foreground mt-1", !reply.isFromAdmin ? 'self-end' : 'self-start')}>
                           {reply.sentAt && formatDistanceToNow(reply.sentAt instanceof Date ? reply.sentAt : reply.sentAt.toDate(), { addSuffix: true })}
                        </span>
                    )}
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
