import { FC, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface NetworkNode {
  id: string;
  latency: number;
  syncError: number;
  playbackRate: number;
}

interface PIDMetrics {
  timestamp: number;
  error: number;
  output: number;
  kp: number;
  ki: number;
  kd: number;
}

export const NetworkSyncVisualization: FC = () => {
  const { syncEnabled } = useMusicSync();
  const { isPlaying } = useMusicPlayer();
  const [metrics, setMetrics] = useState<PIDMetrics[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [pidParams, setPidParams] = useState({
    kp: 0.5,
    ki: 0.2,
    kd: 0.1
  });

  // Update metrics every 100ms when playing and sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isPlaying) return;

    const interval = setInterval(() => {
      // Simulate metrics for now - will be replaced with real data
      const newMetric: PIDMetrics = {
        timestamp: Date.now(),
        error: Math.random() * 0.2 - 0.1,
        output: Math.random() * 0.4 - 0.2,
        ...pidParams
      };

      setMetrics(prev => [...prev.slice(-50), newMetric]); // Keep last 50 points
    }, 100);

    return () => clearInterval(interval);
  }, [syncEnabled, isPlaying, pidParams]);

  const handlePIDChange = useCallback((param: keyof typeof pidParams, value: number) => {
    setPidParams(prev => ({ ...prev, [param]: value }));
  }, []);

  return (
    <Card className="p-4 mt-4">
      <h3 className="text-lg font-semibold mb-4">Network Synchronization Status</h3>
      
      {/* PID Controller Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Label>Proportional Gain (Kp)</Label>
          <Slider
            value={[pidParams.kp]}
            onValueChange={([value]) => handlePIDChange('kp', value)}
            min={0}
            max={2}
            step={0.1}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidParams.kp.toFixed(2)}</span>
        </div>
        <div>
          <Label>Integral Gain (Ki)</Label>
          <Slider
            value={[pidParams.ki]}
            onValueChange={([value]) => handlePIDChange('ki', value)}
            min={0}
            max={1}
            step={0.05}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidParams.ki.toFixed(2)}</span>
        </div>
        <div>
          <Label>Derivative Gain (Kd)</Label>
          <Slider
            value={[pidParams.kd]}
            onValueChange={([value]) => handlePIDChange('kd', value)}
            min={0}
            max={1}
            step={0.05}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidParams.kd.toFixed(2)}</span>
        </div>
      </div>

      {/* Metrics Visualization */}
      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metrics}>
            <XAxis 
              dataKey="timestamp" 
              domain={['auto', 'auto']}
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => new Date(value).toLocaleTimeString()}
              formatter={(value: number) => value.toFixed(3)}
            />
            <Line 
              type="monotone" 
              dataKey="error" 
              stroke="#ef4444" 
              dot={false} 
              name="Sync Error"
            />
            <Line 
              type="monotone" 
              dataKey="output" 
              stroke="#3b82f6" 
              dot={false} 
              name="PID Output"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Network Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Sync Status</Label>
          <div className="flex items-center mt-2">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${
                syncEnabled ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span>{syncEnabled ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div>
          <Label>Average Latency</Label>
          <div className="mt-2">
            {syncEnabled ? '45ms' : 'N/A'}
          </div>
        </div>
      </div>
    </Card>
  );
};
