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

interface NetworkMetrics {
  timestamp: number;
  error: number;
  output: number;
  entropy: number;
  freeEnergy: number;
  kp: number;
  ki: number;
  kd: number;
}

export const NetworkSyncVisualization: FC = () => {
  const { syncEnabled, pidMetrics, updatePIDParameters } = useMusicSync();
  const { isPlaying } = useMusicPlayer();
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);

  // Update metrics every 100ms when playing and sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isPlaying) return;

    const interval = setInterval(() => {
      // Calculate entropy and free energy based on current network state
      const entropy = calculateNetworkEntropy(nodes);
      const freeEnergy = calculateFreeEnergy(nodes);

      const newMetric: NetworkMetrics = {
        timestamp: Date.now(),
        error: pidMetrics.error,
        output: pidMetrics.output,
        entropy,
        freeEnergy,
        ...pidMetrics.parameters
      };

      setMetrics(prev => [...prev.slice(-50), newMetric]); // Keep last 50 points
    }, 100);

    return () => clearInterval(interval);
  }, [syncEnabled, isPlaying, pidMetrics, nodes]);

  const calculateNetworkEntropy = (nodes: NetworkNode[]) => {
    if (nodes.length === 0) return 0;
    // Implement entropy calculation based on sync errors distribution
    const totalError = nodes.reduce((sum, node) => sum + Math.abs(node.syncError), 0);
    const normalizedErrors = nodes.map(node => Math.abs(node.syncError) / totalError);
    return -normalizedErrors.reduce((entropy, p) => 
      entropy + (p > 0 ? p * Math.log(p) : 0), 0);
  };

  const calculateFreeEnergy = (nodes: NetworkNode[]) => {
    if (nodes.length === 0) return 0;
    // Implementation based on the article's free energy formula
    const avgPlaybackRate = nodes.reduce((sum, node) => sum + node.playbackRate, 0) / nodes.length;
    const avgLatency = nodes.reduce((sum, node) => sum + node.latency, 0) / nodes.length;
    return Math.log(avgPlaybackRate) / avgLatency;
  };

  const handlePIDChange = useCallback((param: keyof typeof pidMetrics.parameters, value: number) => {
    updatePIDParameters({
      ...pidMetrics.parameters,
      [param]: value
    });
  }, [pidMetrics.parameters, updatePIDParameters]);

  return (
    <Card className="p-4 mt-4">
      <h3 className="text-lg font-semibold mb-4">Network Synchronization Status</h3>

      {/* PID Controller Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <Label>Proportional Gain (Kp)</Label>
          <Slider
            value={[pidMetrics.parameters.kp]}
            onValueChange={([value]) => handlePIDChange('kp', value)}
            min={0}
            max={2}
            step={0.1}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidMetrics.parameters.kp.toFixed(2)}</span>
        </div>
        <div>
          <Label>Integral Gain (Ki)</Label>
          <Slider
            value={[pidMetrics.parameters.ki]}
            onValueChange={([value]) => handlePIDChange('ki', value)}
            min={0}
            max={1}
            step={0.05}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidMetrics.parameters.ki.toFixed(2)}</span>
        </div>
        <div>
          <Label>Derivative Gain (Kd)</Label>
          <Slider
            value={[pidMetrics.parameters.kd]}
            onValueChange={([value]) => handlePIDChange('kd', value)}
            min={0}
            max={1}
            step={0.05}
            className="mt-2"
          />
          <span className="text-sm text-muted-foreground">{pidMetrics.parameters.kd.toFixed(2)}</span>
        </div>
      </div>

      {/* Network Flow Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <Label>Network Entropy (Flow Diversity)</Label>
          <div className="h-40">
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
                  dataKey="entropy"
                  stroke="#10b981"
                  dot={false}
                  name="Entropy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <Label>Network Free Energy (Signal Speed)</Label>
          <div className="h-40">
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
                  dataKey="freeEnergy"
                  stroke="#8b5cf6"
                  dot={false}
                  name="Free Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* PID Control Metrics */}
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
          <Label>Network Statistics</Label>
          <div className="mt-2 space-y-1 text-sm">
            <div>Connected Nodes: {nodes.length}</div>
            <div>Avg. Latency: {nodes.length ? 
              (nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length).toFixed(0) 
              : 'N/A'} ms</div>
          </div>
        </div>
      </div>
    </Card>
  );
};