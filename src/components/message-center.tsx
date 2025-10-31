
'use client';

import { useState, useMemo } from 'react';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
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
  DialogClose,
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
import { Send, ArrowLeft } from 'lucide-react';

export function MessageCenter() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(
    () => query(collection(firestore, 'messages'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);

  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const repliesQuery = useMemoFirebase(
    () =>
      selectedMessage
        ? query(
            collection(firestore, 'messages', selectedMessage.id, 'replies'),
            orderBy('sentAt', 'asc')
          )
        : null,
    [firestore, selectedMessage]
  );
  const { data: replies } = useCollection<Reply>(repliesQuery);

  const handleRowClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      const docRef = doc(firestore, 'messages', message.id);
      updateDocumentNonBlocking(docRef, { isRead: true });
    }
  };

  const handleSendReply = async () => {
    if (!replyText || !selectedMessage || !firestore) return;
    setIsReplying(true);
    try {
      const repliesCollection = collection(
        firestore,
        'messages',
        selectedMessage.id,
        'replies'
      );
      addDocumentNonBlocking(repliesCollection, {
        message: replyText,
        sentAt: serverTimestamp(),
        isFromAdmin: true,
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
                    {selectedMessage?.email || 'Anonymous User'}
                </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/50 rounded-md">
          {/* Initial Message */}
          <div className="flex flex-col items-start">
            <div className="rounded-lg bg-background p-3 max-w-lg shadow-sm">
              <p className="text-sm">{selectedMessage?.message}</p>
            </div>
            <span className="text-xs text-muted-foreground mt-1">
              {selectedMessage?.createdAt &&
                formatDistanceToNow(selectedMessage.createdAt.toDate(), { addSuffix: true })}
            </span>
          </div>

          {/* Replies */}
          {replies?.map((reply) => (
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
        </div>
        <DialogFooter className="pt-4 border-t">
          <div className="flex w-full gap-2">
            <Textarea
              placeholder="Type your reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleSendReply} disabled={isReplying || !replyText}>
              <Send className="h-4 w-4" />
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
                <TableHead>Message</TableHead>
                <TableHead className="w-[150px] text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    Loading messages...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && messages?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">
                    No messages yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                messages?.map((message) => (
                  <TableRow
                    key={message.id}
                    onClick={() => handleRowClick(message)}
                    className="cursor-pointer"
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
                      {message.message}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {message.createdAt &&
                        formatDistanceToNow(message.createdAt.toDate(), {
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
