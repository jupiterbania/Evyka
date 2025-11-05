
'use client';

import { redirect } from 'next/navigation';
import { useUser } from '@/firebase';

export default function ProfileRedirectPage() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    // You can show a loading spinner here if you want
    return null;
  }

  if (user) {
    redirect(`/profile/${user.uid}`);
  } else {
    // Redirect to home or login page if no user is logged in
    redirect('/');
  }

  return null;
}
