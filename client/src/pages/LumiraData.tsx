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

// Process raw database metrics into chart-friendly format
function processMetrics(rawMetrics: any[]): LumiraMetric[] {
  if (!Array.isArray(rawMetrics) || rawMetrics.length === 0) {
    return [];
  }

  // Group by data_type
  const metricsByType = new Map<string, LumiraDataPoint[]>();

  rawMetrics.forEach(row => {
    if (!row || !row.data_type || !row.bucket || !Array.isArray(row.data_points)) {
      return;
    }

    const { bucket, data_type, data_points } = row;

    if (!metricsByType.has(data_type)) {
      metricsByType.set(data_type, []);
    }

    // Calculate average value from data points
    const value = data_points.reduce((sum: number, point: any) => {
      const pointValue = data_type === 'playback' ? 
        (point.isPlaying ? 1 : 0) : // For playback, use playing state
        (point.speed || point.accuracy || 0); // For GPS, use speed or accuracy
      return sum + pointValue;
    }, 0) / Math.max(data_points.length, 1); // Prevent division by zero

    metricsByType.get(data_type)!.push({
      timestamp: bucket,
      value,
      metric: data_type
    });
  });

  // Convert to array of metrics
  return Array.from(metricsByType.entries()).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    data: data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }));
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

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ["/api/lumira/metrics", { start: start.toISOString(), end: end.toISOString(), interval }],
    select: processMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data fresh for 15 seconds
  });

  // Show loading state only when we have no data at all
  const showLoading = isLoading && metrics.length === 0;

  if (showLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Network Performance Overview</h1>
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return selectedRange === '1h' ? 
      date.toLocaleTimeString() : 
      date.toLocaleString();
  };

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

        {metrics.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No metrics data available for the selected time range.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader>
                  <CardTitle>{metric.name} Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metric.data}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                        <XAxis 
                          dataKey="timestamp"
                          tickFormatter={formatDate}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          labelFormatter={formatDate}
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
                          activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}