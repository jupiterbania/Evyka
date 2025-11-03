
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  collectionGroup,
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
import { Send, ArrowLeft, Loader2, Image as ImageIcon, X } from 'lucide-react';
import Image from 'next/image';

export function MessageCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesQuery = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'messages') : null),
    [firestore]
  );
  const { data: messages, isLoading, error } = useCollection<Message>(messagesQuery);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    // Client-side sorting
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
      toast({
        variant: 'destructive',
        title: 'Error loading messages',
        description: error.message,
      });
    }
  }, [error, toast]);

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

  const handleSendReply = async () => {
    if ((!replyText.trim() && !imageFile) || !selectedMessage || !firestore) return;
    setIsReplying(true);

    try {
      let imageUrl: string | undefined = undefined;

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
        imageUrl = uploadResult.mediaUrl;
      }

      const now = serverTimestamp();
      const lastMessageSnippet = imageUrl ? '📷 Image' : replyText.substring(0, 100);

      const threadDocRef = doc(firestore, 'users', selectedMessage.userId, 'messages', selectedMessage.id);
      const repliesCollection = collection(threadDocRef, 'replies');

      const newReply: Omit<Reply, 'id'> = {
        message: replyText,
        imageUrl,
        sentAt: now as any,
        isFromAdmin: true,
      };

      addDocumentNonBlocking(repliesCollection, newReply);
      updateDocumentNonBlocking(threadDocRef, {
        lastReplyAt: now,
        lastMessageSnippet,
      });

      setReplyText('');
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({ title: 'Reply Sent!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Reply Failed',
        description: error.message,
      });
    } finally {
      setIsReplying(false);
    }
  };

  useEffect(() => {
    if (selectedMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replies, selectedMessage]);

  const renderDetailView = () => (
    <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedMessage(null)}>
              <ArrowLeft />
            </Button>
            <div>
              <DialogTitle>Conversation with {selectedMessage?.name}</DialogTitle>
              <DialogDescription>{selectedMessage?.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/50 rounded-md">
          {/* Initial Message */}
          <div className="flex flex-col items-start">
            <div className="rounded-lg bg-background p-3 max-w-lg shadow-sm">
                {selectedMessage?.imageUrl && (
                    <Image src={selectedMessage.imageUrl} alt="Sent image" width={300} height={300} className="rounded-md mb-2" />
                )}
                {selectedMessage?.firstMessage && <p className="text-sm">{selectedMessage.firstMessage}</p>}
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {selectedMessage?.createdAt && formatDistanceToNow(selectedMessage.createdAt.toDate(), { addSuffix: true })}
            </span>
          </div>

          {/* Replies */}
          {areRepliesLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : replies?.map((reply) => (
            <div
              key={reply.id}
              className={cn('flex flex-col', reply.isFromAdmin ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'rounded-lg p-3 max-w-lg shadow-sm',
                  reply.isFromAdmin ? 'bg-primary text-primary-foreground' : 'bg-background'
                )}
              >
                {reply.imageUrl && (
                    <Image src={reply.imageUrl} alt="Sent image" width={300} height={300} className="rounded-md mb-2" />
                )}
                {reply.message && <p className="text-sm">{reply.message}</p>}
              </div>
              <span className="text-xs text-muted-foreground mt-1">
                {reply.sentAt && formatDistanceToNow(reply.sentAt.toDate(), { addSuffix: true })}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <DialogFooter className="pt-4 border-t flex-col">
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
          <div className="flex w-full gap-2 items-center">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              disabled={isReplying}
            />
            <Button onClick={handleSendReply} disabled={isReplying || (!replyText.trim() && !imageFile)}>
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
