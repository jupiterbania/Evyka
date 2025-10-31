
import { MessageCenter } from '@/components/message-center';

export default function AdminMessagesPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Message Center</h1>
        <p className="text-sm sm:text-base text-muted-foreground">View and respond to user messages.</p>
      </header>
      
      <MessageCenter />
    </div>
  );
}
