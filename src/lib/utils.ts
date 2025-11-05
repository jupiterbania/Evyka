import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateLikesForDuration(
  duration: 'daily' | 'weekly' | 'monthly' | 'allTime',
  dailyLikes: number,
  weeklyLikes: number,
  monthlyLikes: number,
  allTimeLikes: number,
): number {
  switch (duration) {
    case 'daily':
      return dailyLikes;
    case 'weekly':
      return weeklyLikes;
    case 'monthly':
      return monthlyLikes;
    case 'allTime':
      return allTimeLikes;
    default:
      return 0;
  }
}
