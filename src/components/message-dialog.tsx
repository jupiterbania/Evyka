
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { MessageSquare } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';


type MessageDialogProps = {
  trigger?: React.ReactElement;
};

export function MessageDialog({ trigger }: MessageDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const resetForm = () => {
    setName('');
    setMessage('');
    setIsOpen(false);
  };

  const handleSendMessage = async () => {
    if (!message || (!user && !name)) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide your name and a message.',
      });
      return;
    }
    if (!firestore) return;

    setIsSending(true);
    const messagesCollection = collection(firestore, 'messages');

    try {
      const messageData: any = {
        message,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      if (user) {
        messageData.name = user.displayName || 'Authenticated User';
        messageData.userId = user.uid;
        messageData.email = user.email;
      } else {
        messageData.name = name;
      }

      addDocumentNonBlocking(messagesCollection, messageData);
      
      resetForm();
      toast({
        title: 'Message Sent!',
        description: 'Thank you for your feedback. We will get back to you shortly.',
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const Trigger = trigger ? Slot : 'button';
  const triggerProps = trigger ? { children: trigger } : {};

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Trigger
          className="text-sm font-medium hover:text-primary"
          {...triggerProps}
        >
          {trigger ? undefined : 'Message Us'}
        </Trigger>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Message</DialogTitle>
          <DialogDescription>
            Have a question or feedback? We'd love to hear from you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!user && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSendMessage} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
