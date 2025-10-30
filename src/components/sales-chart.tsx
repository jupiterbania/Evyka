"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { photoSalesData } from "@/lib/placeholder-data"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function SalesChart() {
  return (
    <div className="h-[300px]">
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart accessibilityLayer data={photoSalesData}>
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
