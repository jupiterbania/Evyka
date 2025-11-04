
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  collectionGroup,
  writeBatch,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { uploadMedia } from '@/ai/flows/upload-media-flow';
import type { Message, Reply } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Send, ArrowLeft, Loader2, Image as ImageIcon, X, Clock, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from './ui/scroll-area';

export function MessageCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesQuery = useMemoFirebase(() => 
    firestore 
      ? query(collectionGroup(firestore, 'messages'))
      : null,
    [firestore]
  );
  
  const { data: messages, isLoading, error } = useCollection<Message>(messagesQuery);
  
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [optimisticReplies, setOptimisticReplies] = useState<Reply[]>([]);
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);


  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => {
      const timeA = a.lastReplyAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const timeB = b.lastReplyAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [messages]);

  const repliesQuery = useMemoFirebase(
    () =>
      selectedMessage && firestore
        ? query(
            collection(firestore, 'users', selectedMessage.userId, 'messages', selectedMessage.id, 'replies'),
            orderBy('sentAt', 'asc')
          )
        : null,
    [firestore, selectedMessage]
  );
  const { data: replies, isLoading: areRepliesLoading, error: repliesError } = useCollection<Reply>(repliesQuery);

  useEffect(() => {
    if (error) {
       if (error.message.includes('firestore/failed-precondition')) {
          toast({
            variant: 'destructive',
            title: 'Index Missing',
            description: "Message ordering may be incorrect. Using fallback sorting.",
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error loading messages',
            description: error.message,
          });
        }
    }
  }, [error, toast, firestore]);

  useEffect(() => {
    if (repliesError) {
      toast({
        variant: 'destructive',
        title: 'Error loading replies',
        description: repliesError.message,
      });
    }
  }, [repliesError, toast]);

  const handleRowClick = (message: Message) => {
    if (!firestore) return;
    setSelectedMessage(message);
    setOptimisticReplies([]);
    // Mark the main message thread as read by the admin.
    if (!message.isRead) {
      const docRef = doc(firestore, 'users', message.userId, 'messages', message.id);
      updateDocumentNonBlocking(docRef, { isRead: true });
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetInput = () => {
    setReplyText('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendReply = async () => {
    if ((!replyText.trim() && !imageFile) || !selectedMessage || !firestore) return;
    
    setIsReplying(true);
    const optimisticId = uuidv4();
    const now = new Date();

    const optimisticReply: Reply = {
      id: optimisticId,
      message: replyText,
      sentAt: now as any,
      isFromAdmin: true,
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
      const lastMessageSnippet = finalImageUrl ? '📷 Image' : replyText.substring(0, 100);

      const threadDocRef = doc(firestore, 'users', selectedMessage.userId, 'messages', selectedMessage.id);
      const repliesCollectionRef = collection(threadDocRef, 'replies');

      const newReply: any = {
        message: replyText,
        sentAt: serverTime,
        isFromAdmin: true,
        imageUrl: finalImageUrl,
      };

      if (!finalImageUrl) {
        delete newReply.imageUrl;
      }

      addDocumentNonBlocking(repliesCollectionRef, newReply);
      updateDocumentNonBlocking(threadDocRef, {
        lastReplyAt: serverTime,
        lastMessageSnippet,
        isRead: true, // Ensure it remains read
      });

      setOptimisticReplies(prev => prev.map(r => r.id === optimisticId ? { ...r, status: 'sent' } : r));

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Reply Failed',
        description: error.message,
      });
      setOptimisticReplies(prev => prev.map(r => r.id === optimisticId ? { ...r, status: 'error' } : r));
    } finally {
      setIsReplying(false);
    }
  };
  
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
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedMessage) {
      scrollToBottom();
    }
  }, [allReplies, selectedMessage]);
  
  // Logic to mark user messages as read
  useEffect(() => {
    if (replies && firestore && selectedMessage) {
        const unreadUserReplies = replies.filter(r => !r.isFromAdmin && !r.isRead);
        if (unreadUserReplies.length > 0) {
            const batch = writeBatch(firestore);
            unreadUserReplies.forEach(reply => {
                const replyRef = doc(firestore, 'users', selectedMessage.userId, 'messages', selectedMessage.id, 'replies', reply.id);
                batch.update(replyRef, { isRead: true });
            });
            batch.commit().catch(err => console.error("Error marking replies as read: ", err));
        }
    }
  }, [replies, firestore, selectedMessage]);

  const renderStatusIcon = (reply: Reply) => {
    if (reply.isFromAdmin) {
        // Admin messages
        if (reply.status === 'error') return <AlertTriangle className="h-4 w-4 text-destructive" />;
        if (reply.status === 'sending') return <Clock className="h-3 w-3 text-muted-foreground" />;
        if (reply.isRead) return <CheckCheck className="h-4 w-4 text-blue-500" />;
        return <Check className="h-4 w-4 text-muted-foreground" />;
    }
    // User messages - no status icon needed for admin
    return null;
  }


  const renderDetailView = () => (
    <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2" onClick={() => setSelectedMessage(null)}>
              <ArrowLeft />
            </Button>
            <div>
              <DialogTitle>Conversation with {selectedMessage?.name}</DialogTitle>
              <DialogDescription>{selectedMessage?.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          <div className="p-4 space-y-4">
            {/* Initial Message */}
            {selectedMessage && (
              <div onClick={() => setSelectedTimestamp(selectedMessage.id)}>
                <div className="flex items-end gap-2 justify-start">
                    <div className={cn('rounded-lg p-2 max-w-lg shadow-sm', 'bg-background')}>
                        {selectedMessage?.imageUrl && (
                            <Dialog>
                                <DialogTrigger>
                                    <Image src={selectedMessage.imageUrl} alt="Sent image" width={200} height={200} className="rounded-md mb-1 max-w-[200px] h-auto cursor-pointer" />
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh] p-0">
                                    <DialogTitle className="sr-only">Enlarged image view</DialogTitle>
                                    <Image src={selectedMessage.imageUrl} alt="Sent image" width={1200} height={1200} className="rounded-lg object-contain max-w-full max-h-[80vh] h-auto" />
                                </DialogContent>
                            </Dialog>
                        )}
                        {selectedMessage?.firstMessage && <p className="text-sm break-words px-1 pb-1">{selectedMessage.firstMessage}</p>}
                    </div>
                </div>
                {selectedTimestamp === selectedMessage.id && selectedMessage.createdAt && (
                  <div className="flex items-end gap-2 justify-start">
                    <span className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(selectedMessage.createdAt.toDate(), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Replies */}
            {areRepliesLoading && !allReplies.length ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : allReplies.map((reply) => (
              <div key={reply.id} onClick={() => setSelectedTimestamp(reply.id)}>
                <div
                  className={cn('flex items-end gap-2', reply.isFromAdmin ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'rounded-lg p-2 max-w-lg shadow-sm flex flex-col',
                      reply.isFromAdmin ? 'bg-primary text-primary-foreground' : 'bg-background'
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
                  <div className={cn("flex items-center gap-1 mt-1", reply.isFromAdmin ? 'justify-end' : 'justify-start')}>
                    <span className="text-xs text-muted-foreground">
                      {reply.sentAt && formatDistanceToNow(reply.sentAt instanceof Date ? reply.sentAt : reply.sentAt.toDate(), { addSuffix: true })}
                    </span>
                     {renderStatusIcon(reply)}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 pt-4 border-t flex-col bg-background">
            {imagePreview && (
                <div className="relative w-24 h-24 mb-2 self-start">
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
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isReplying}>
                <ImageIcon />
                <span className="sr-only">Upload Image</span>
            </Button>
            <Textarea
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-grow"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              disabled={isReplying}
            />
            <Button onClick={handleSendReply} disabled={isReplying || (!replyText.trim() && !imageFile)} size="icon" className="shrink-0">
              {isReplying ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead className="w-[150px] text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && sortedMessages?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No messages yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                sortedMessages?.map((message) => (
                  <TableRow
                    key={message.id}
                    onClick={() => handleRowClick(message)}
                    className={cn('cursor-pointer', !message.isRead && 'bg-muted/50 hover:bg-muted')}
                  >
                    <TableCell>
                      <div className="font-medium">{message.name}</div>
                      {!message.isRead && (
                        <Badge variant="default" className="mt-1">
                          New
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-muted-foreground">
                      {message.lastMessageSnippet}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {message.lastReplyAt &&
                        formatDistanceToNow(message.lastReplyAt.toDate(), {
                          addSuffix: true,
                        })}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {renderDetailView()}
      </CardContent>
    </Card>
  );
}

    