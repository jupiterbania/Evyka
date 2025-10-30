"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingCart, ImageIcon } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { Image, Purchase } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export function DashboardStats() {
    const firestore = useFirestore();
    const imagesCollection = useMemoFirebase(() => collection(firestore, 'images'), [firestore]);
    const { data: images, isLoading: imagesLoading } = useCollection<Image>(imagesCollection);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [statsError, setStatsError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const calculateStats = async () => {
            const usersRef = collection(firestore, 'users');
            
            try {
                const usersSnapshot = await getDocs(usersRef);
                let revenue = 0;
                let sales = 0;

                for (const userDoc of usersSnapshot.docs) {
                    const userPurchasesCollection = collection(firestore, 'users', userDoc.id, 'purchases');
                    const purchasesSnapshot = await getDocs(userPurchasesCollection);
                    purchasesSnapshot.forEach(purchaseDoc => {
                        const purchase = purchaseDoc.data() as Purchase;
                        revenue += purchase.price;
                        sales += 1;
                    });
                }
                setTotalRevenue(revenue);
                setTotalSales(sales);
            } catch (error: any) {
                // This is a simplified path for getDocs which doesn't have a built-in error callback
                // like onSnapshot. We'll create and emit the error manually.
                const permissionError = new FirestorePermissionError({
                    path: usersRef.path,
                    operation: 'list', 
                });
                errorEmitter.emit('permission-error', permissionError);
                setStatsError("You don't have permission to view all user statistics.");
            }
        };

        calculateStats();

    }, [firestore]);

    const stats = [
        {
            title: "Total Revenue",
            value: statsError ? 'Error' : `$${totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            description: statsError || "Total revenue from all image sales."
        },
        {
            title: "Total Sales",
            value: statsError ? 'Error' : totalSales.toLocaleString(),
            icon: ShoppingCart,
            description: statsError || "Total number of images sold."
        },
        {
            title: "Images Available",
            value: images?.length.toLocaleString() ?? '...',
            icon: ImageIcon,
            description: "Total number of images in the gallery."
        }
    ]
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
