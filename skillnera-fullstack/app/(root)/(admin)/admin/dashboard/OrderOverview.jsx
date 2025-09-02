"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { useEffect, useState } from "react"
import useFetch from "@/hooks/useFetch"
// const chartData = [
//     { month: "January", amount: 186 },
//     { month: "February", amount: 305 },
//     { month: "March", amount: 237 },
//     { month: "April", amount: 73 },
//     { month: "May", amount: 209 },
//     { month: "June", amount: 214 },
//     { month: "July", amount: 554 },
//     { month: "August", amount: 158 },
//     { month: "September", amount: 327 },
//     { month: "November", amount: 200 },
//     { month: "December", amount: 597 },
// ]

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "November",
    "December",
]

const chartConfig = {
    amount: {
        label: "Amount",
        color: "#8e51ff",
    },
}

export function OrderOverview() {

    const [chartData, setChartData] = useState([])
    const { data: monthlySales, loading } = useFetch('/api/dashboard/admin/monthly-sales')
    useEffect(() => {
        if (monthlySales && monthlySales.success) {
            const getChartData = months.map((month, index) => {
                const monthData = monthlySales.data.find(item => item._id.month === index + 1)

                return {
                    month: month,
                    amount: monthData ? monthData.totalSales : 0
                }
            })

            setChartData(getChartData)
        }


    }, [monthlySales])

 
    return (
        <div>
            <ChartContainer config={chartConfig}>
                <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                        cursor={true}
                        content={<ChartTooltipContent />}
                    />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={5} />
                </BarChart>
            </ChartContainer>
        </div>
    )
}
