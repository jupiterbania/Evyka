'use client';
import { useUser } from '@/firebase';

export function AdBanner() {
  const { user } = useUser();
  const designatedAdminEmail = 'jupiterbania472@gmail.com';
  const isAdmin = user?.email === designatedAdminEmail;

  if (isAdmin) {
    return null; // Don't render ad for admin
  }

  return (
    <div className="flex justify-center items-center aspect-[3/4] w-full">
        <div className="flex flex-col justify-center items-center w-full">
             {/* The ad script has been removed as requested. */}
        </div>
    </div>
  );
}
