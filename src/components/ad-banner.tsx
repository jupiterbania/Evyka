'use client';

import { useEffect, useState } from 'react';

export function AdBanner() {
  const [isAdVisible, setIsAdVisible] = useState(false);

  useEffect(() => {
    // In a real application, you would check for an ad blocker here.
    // For this example, we'll just simulate the ad appearing after a short delay.
    const timer = setTimeout(() => {
      setIsAdVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!isAdVisible) {
    return null;
  }

  return (
    <div className="bg-gray-100 p-4 text-center">
      <p className="text-sm text-gray-700">Advertisement</p>
      {/* Your ad content goes here */}
    </div>
  );
}
