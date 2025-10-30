"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, getDocs, query, Timestamp } from "firebase/firestore";
import type { Purchase } from "@/lib/types";
import { format } from "date-fns";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function SalesChart() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const firestore = useFirestore();

  const imagesQuery = useMemoFirebase(() => query(collection(firestore, 'images')), [firestore]);
  const { data: images, isLoading: imagesLoading, error: imagesError } = useCollection<any>(imagesQuery);

  useEffect(() => {
    const processSalesData = async () => {
        if (!firestore || !images) return;

        const monthlySales: { [key: string]: number } = {};

        try {
            for (const imageDoc of images) {
                const purchasesCollectionRef = collection(firestore, 'images', imageDoc.id, 'purchases');
                const purchasesSnapshot = await getDocs(purchasesCollectionRef);
                
                purchasesSnapshot.forEach(purchaseDoc => {
                    const purchase = purchaseDoc.data() as Purchase;
                    // Check for Timestamp and convert to Date
                    if (purchase.purchaseDate && 'toDate' in purchase.purchaseDate) {
                        const purchaseDate = (purchase.purchaseDate as Timestamp).toDate();
                        const month = format(purchaseDate, 'MMM');
                        monthlySales[month] = (monthlySales[month] || 0) + 1;
                    }
                });
            }
            
            const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            const chartData = monthOrder.map(month => ({
                name: month,
                sales: monthlySales[month] || 0
            })).slice(0, new Date().getMonth() + 1); // Only show up to the current month

            setSalesData(chartData);
        } catch (err: any) {
            console.error("Error processing sales data:", err);
            // This error is now less likely to be a permissions error on the top-level collection
            // but could still occur on subcollections if rules are misconfigured.
        }
    };

    processSalesData();
  }, [firestore, images]);
  
  if (imagesError) {
    return <div className="h-[300px] flex items-center justify-center text-destructive">You don't have permission to view sales data.</div>
  }

  if (imagesLoading) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart data...</div>
  }

  if (!salesData.length) {
    return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Not enough data to display chart.</div>
  }

  return (
    <div className="h-[300px]">
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart accessibilityLayer data={salesData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
        <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
      </BarChart>
    </ChartContainer>
    </div>
  )
}
