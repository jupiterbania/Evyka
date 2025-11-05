
'use client';
import { Header } from '@/components/header';
import { Loader2, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Conversation, User as AppUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const conversationsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, 'conversations'),
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageAt', 'desc')
          )
        : null,
    [firestore, user]
  );

  const { data: conversations, isLoading: areConversationsLoading } = useCollection<Conversation>(conversationsQuery);
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };
  
  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  const renderContent = () => {
    const isLoading = isUserLoading || areConversationsLoading;
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Conversations...</p>
        </div>
      );
    }

    if (!user) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <User className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Sign in to view messages</h2>
                <p className="text-muted-foreground mt-2">
                    Once you sign in, your conversations will appear here.
                </p>
            </div>
        )
    }

    if (!conversations || conversations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold">No Messages Yet</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Find someone to talk to from their profile page, or by exploring the feed. When you start a new conversation, it will appear here.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Explore and Connect</Link>
          </Button>
        </div>
      );
    }
    
    return (
        <div className="max-w-2xl mx-auto">
            <ul className="divide-y divide-border">
                {conversations.map(convo => {
                    const otherParticipant = convo.participantInfo?.find(p => p.userId !== user.uid);
                    if (!otherParticipant) return null;

                    return (
                        <li key={convo.id} className="p-4 hover:bg-muted cursor-pointer" onClick={() => handleConversationClick(convo.id)}>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={otherParticipant.profileImageUrl} />
                                    <AvatarFallback>{getInitials(otherParticipant.username)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold truncate">{otherParticipant.username}</h3>
                                        {convo.lastMessageAt && (
                                             <p className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatDistanceToNow(convo.lastMessageAt.toDate(), { addSuffix: true })}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {convo.lastMessageSenderId === user.uid && 'You: '}{convo.lastMessage}
                                    </p>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-headline mb-6 text-center sm:text-left">Messages</h1>
            {renderContent()}
        </div>
      </main>
    </div>
  );
}
