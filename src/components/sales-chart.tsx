"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useFirestore } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
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

  useEffect(() => {
    const fetchSalesData = async () => {
        if (!firestore) return;
        const monthlySales: { [key: string]: number } = {};

        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        for (const userDoc of usersSnapshot.docs) {
            const purchasesCollection = collection(firestore, 'users', userDoc.id, 'purchases');
            const purchasesSnapshot = await getDocs(purchasesCollection);
            purchasesSnapshot.forEach(doc => {
                const purchase = doc.data() as Purchase;
                if (purchase.purchaseDate) {
                    const month = format(purchase.purchaseDate.toDate(), 'MMM');
                    monthlySales[month] = (monthlySales[month] || 0) + 1;
                }
            });
        }
        
        const chartData = Object.keys(monthlySales).map(month => ({
            name: month,
            sales: monthlySales[month]
        }));

        // Sort data by month if necessary, or just use as is
        setSalesData(chartData);
    };

    fetchSalesData();
  }, [firestore]);

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
