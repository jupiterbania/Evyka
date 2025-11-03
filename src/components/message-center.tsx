
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
import { Send, ArrowLeft, Loader2 } from 'lucide-react';

export function MessageCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Query across all users' message collections without server-side ordering.
  const messagesQuery = useMemoFirebase(
    () => firestore ? collectionGroup(firestore, 'messages') : null,
    [firestore]
  );
  const {data: messages, isLoading, error} = useCollection<Message>(messagesQuery);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Sort messages on the client side
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort((a, b) => {
      const timeA = a.lastReplyAt?.toMillis() || 0;
      const timeB = b.lastReplyAt?.toMillis() || 0;
      return timeB - timeA;
    });
  }, [messages]);

  // Get replies for the currently selected message thread.
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
  const {data: replies, isLoading: areRepliesLoading, error: repliesError} = useCollection<Reply>(repliesQuery);


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
  
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage || !firestore) return;
    setIsReplying(true);

    try {
      const now = serverTimestamp();
      const lastMessageSnippet = replyText.substring(0, 100);

      const threadDocRef = doc(firestore, 'users', selectedMessage.userId, 'messages', selectedMessage.id);
      const repliesCollection = collection(threadDocRef, 'replies');

      const newReply: Omit<Reply, 'id'> = {
        message: replyText,
        sentAt: now as any,
        isFromAdmin: true,
      };

      // Non-blocking writes
      addDocumentNonBlocking(repliesCollection, newReply);
      updateDocumentNonBlocking(threadDocRef, {
        lastReplyAt: now,
        lastMessageSnippet,
      });

      setReplyText('');
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
    if(selectedMessage) {
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
                <DialogDescription>
                    {selectedMessage?.email}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/50 rounded-md">
          {/* Initial Message */}
          <div className="flex flex-col items-start">
            <div className="rounded-lg bg-background p-3 max-w-lg shadow-sm">
              <p className="text-sm">{selectedMessage?.firstMessage}</p>
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {selectedMessage?.createdAt &&
                formatDistanceToNow(selectedMessage.createdAt.toDate(), { addSuffix: true })}
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
              className={cn(
                'flex flex-col',
                reply.isFromAdmin ? 'items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'rounded-lg p-3 max-w-lg shadow-sm',
                  reply.isFromAdmin
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
           <div ref={messagesEndRef} />
        </div>
        <DialogFooter className="pt-4 border-t">
          <div className="flex w-full gap-2">
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
            />
            <Button onClick={handleSendReply} disabled={isReplying || !replyText.trim()}>
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
                    className={cn(
                        "cursor-pointer",
                        !message.isRead && "bg-muted/50 hover:bg-muted"
                    )}
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
