import React from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LumiraDataPoint {
  timestamp: string;
  value: number;
  metric: string;
}

interface LumiraMetric {
  name: string;
  data: LumiraDataPoint[];
}

// Time range options
const timeRanges = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' }
];

export default function LumiraData() {
  const [selectedRange, setSelectedRange] = React.useState('24h');

  // Calculate start time based on selected range
  const getTimeRange = () => {
    const end = new Date();
    const start = new Date();

    switch (selectedRange) {
      case '1h':
        start.setHours(end.getHours() - 1);
        return { start, end, interval: 1 };
      case '6h':
        start.setHours(end.getHours() - 6);
        return { start, end, interval: 5 };
      case '24h':
        start.setHours(end.getHours() - 24);
        return { start, end, interval: 15 };
      case '7d':
        start.setDate(end.getDate() - 7);
        return { start, end, interval: 60 };
      case '30d':
        start.setDate(end.getDate() - 30);
        return { start, end, interval: 240 };
      default:
        start.setHours(end.getHours() - 24);
        return { start, end, interval: 15 };
    }
  };

  const { start, end, interval } = getTimeRange();

  const { data: metrics, isLoading, error } = useQuery<LumiraMetric[]>({
    queryKey: ["/api/lumira/metrics", { start: start.toISOString(), end: end.toISOString(), interval }],
    refetchInterval: 30000, // Refresh every 30 seconds instead of 5
    staleTime: 15000, // Consider data fresh for 15 seconds
    keepPreviousData: true, // Keep showing old data while fetching new data
  });

  const renderChart = (data: LumiraDataPoint[] = [], height: number = 400, dotRadius: number = 6) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleString()}
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: dotRadius, fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  if (error) {
    return (
      <Layout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive">Error loading Lumira data. Please try again later.</div>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Network Performance Overview</h1>
          <Select value={selectedRange} onValueChange={setSelectedRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Network Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {isLoading && !metrics ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[90%] w-[95%]" />
                </div>
              ) : (
                renderChart(metrics?.[0]?.data)
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isLoading && !metrics ? Array(2).fill(null) : metrics?.slice(1) || []).map((metric, idx) => (
            <Card key={metric?.name || idx}>
              <CardHeader>
                <CardTitle>{metric?.name || <Skeleton className="h-6 w-32" />}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {metric ? (
                    renderChart(metric.data, 200, 4)
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Skeleton className="h-[90%] w-[95%]" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}