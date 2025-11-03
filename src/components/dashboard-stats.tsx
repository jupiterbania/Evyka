
"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Film, ImageIcon } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Media } from "@/lib/types";
import { useMemo } from "react";

export function DashboardStats() {
    const firestore = useFirestore();
    
    const mediaQuery = useMemoFirebase(() => firestore ? collection(firestore, 'media') : null, [firestore]);
    const { data: mediaItems, isLoading: mediaLoading } = useCollection<Media>(mediaQuery);

    const imageCount = useMemo(() => mediaItems?.filter(i => i.mediaType === 'image').length ?? 0, [mediaItems]);
    const videoCount = useMemo(() => mediaItems?.filter(i => i.mediaType === 'video').length ?? 0, [mediaItems]);


    const stats = [
        {
            title: "Total Images",
            value: mediaLoading ? '...' : imageCount.toLocaleString(),
            icon: ImageIcon,
            description: "Total number of images in the gallery."
        },
        {
            title: "Total Videos",
            value: mediaLoading ? '...' : videoCount.toLocaleString(),
            icon: Film,
            description: "Total number of videos in the gallery."
        },
    ]
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
         <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
                {stat.description}
            </p>
            </CardContent>
      </Card>
      ))}
    </div>
  );
}
