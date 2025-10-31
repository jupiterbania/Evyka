
"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Image } from "@/lib/types";

export function DashboardStats() {
    const firestore = useFirestore();
    
    const imagesQuery = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
    const { data: images, isLoading: imagesLoading } = useCollection<Image>(imagesQuery);


    const stats = [
        {
            title: "Total Images",
            value: imagesLoading ? '...' : (images?.length ?? 0).toLocaleString(),
            icon: ImageIcon,
            description: "Total number of images in the gallery."
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
