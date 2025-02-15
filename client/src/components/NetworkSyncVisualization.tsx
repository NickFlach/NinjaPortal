import { FC, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMusicSync } from "@/contexts/MusicSyncContext";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

interface NetworkMetrics {
  timestamp: number;
  error: number;
  output: number;
  integral: number;
  derivative: number;
  entropy: number;
  freeEnergy: number;
  targetTime: number;
  currentTime: number;
  kp: number;
  ki: number;
  kd: number;
  controlLoop1Error?: number; // Added for control loop 1 error
  controlLoop2Error?: number; // Added for control loop 2 error
  controlLoop1Output?: number; // Added for control loop 1 output
  controlLoop2Output?: number; // Added for control loop 2 output

}

export const NetworkSyncVisualization: FC = () => {
  const { syncEnabled, pidMetrics, updatePIDParameters, connectedNodes, controlLoopMetrics } = useMusicSync();
  const { isPlaying, audioRef } = useMusicPlayer();
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);

  // Update metrics every 100ms when playing and sync is enabled
  useEffect(() => {
    if (!syncEnabled || !isPlaying) return;

    const interval = setInterval(() => {
      // Calculate entropy and free energy based on current network state
      const entropy = calculateNetworkEntropy(connectedNodes);
      const freeEnergy = calculateFreeEnergy(connectedNodes);

      const newMetric: NetworkMetrics = {
        timestamp: Date.now(),
        error: pidMetrics.error,
        output: pidMetrics.output,
        integral: pidMetrics.integral,
        derivative: pidMetrics.derivative,
        entropy,
        freeEnergy,
        targetTime: audioRef.current?.currentTime || 0,
        currentTime: audioRef.current?.currentTime || 0,
        ...pidMetrics.parameters,
        controlLoop1Error: controlLoopMetrics?.loop1?.error, // Added for control loop 1 error
        controlLoop2Error: controlLoopMetrics?.loop2?.error, // Added for control loop 2 error
        controlLoop1Output: controlLoopMetrics?.loop1?.output, // Added for control loop 1 output
        controlLoop2Output: controlLoopMetrics?.loop2?.output, // Added for control loop 2 output
      };

      setMetrics(prev => [...prev.slice(-50), newMetric]); // Keep last 50 points
    }, 100);

    return () => clearInterval(interval);
  }, [syncEnabled, isPlaying, pidMetrics, connectedNodes, audioRef, controlLoopMetrics]);

  const calculateNetworkEntropy = (nodes: typeof connectedNodes) => {
    if (nodes.length === 0) return 0;
    // Implement entropy calculation based on sync errors distribution
    const totalError = nodes.reduce((sum, node) => sum + Math.abs(node.syncError), 0);
    const normalizedErrors = nodes.map(node => Math.abs(node.syncError) / totalError);
    return -normalizedErrors.reduce((entropy, p) =>
      entropy + (p > 0 ? p * Math.log(p) : 0), 0);
  };

  const calculateFreeEnergy = (nodes: typeof connectedNodes) => {
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

      {/* Timing Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label>Target Time</Label>
          <div className="text-lg font-mono">
            {metrics.length > 0 ? `${metrics[metrics.length - 1].targetTime.toFixed(1)}ms` : '0.0ms'}
          </div>
        </div>
        <div>
          <Label>Current Time</Label>
          <div className="text-lg font-mono">
            {metrics.length > 0 ? `${metrics[metrics.length - 1].currentTime.toFixed(1)}ms` : '0.0ms'}
          </div>
        </div>
      </div>

      {/* PID Terms Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <Label>Error</Label>
          <div className="text-lg font-mono">
            {pidMetrics.error.toFixed(3)}ms
          </div>
        </div>
        <div>
          <Label>Output</Label>
          <div className="text-lg font-mono">
            {pidMetrics.output.toFixed(3)}
          </div>
        </div>
        <div>
          <Label>Integral Term</Label>
          <div className="text-lg font-mono">
            {pidMetrics.integral.toFixed(3)}
          </div>
        </div>
        <div>
          <Label>Derivative Term</Label>
          <div className="text-lg font-mono">
            {pidMetrics.derivative.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Sync Error and PID Output Combined */}
      <Card className="p-4 mb-6">
        <Label>PID Controller Response</Label>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <XAxis
                dataKey="timestamp"
                domain={['auto', 'auto']}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                formatter={(value: number) => value.toFixed(3)}
              />
              <Legend /> {/* Added Legend */}
              <Line
                type="monotone"
                dataKey="error"
                stroke="#ef4444"
                dot={false}
                name="Sync Error"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="output"
                stroke="#3b82f6"
                dot={false}
                name="PID Output"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="integral"
                stroke="#10b981"
                dot={false}
                name="Integral Term"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="derivative"
                stroke="#8b5cf6"
                dot={false}
                name="Derivative Term"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="controlLoop1Error"
                stroke="#DC2626"
                dot={false}
                name="Control Loop 1 Error"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="controlLoop2Error"
                stroke="#65A30D"
                dot={false}
                name="Control Loop 2 Error"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="controlLoop1Output"
                stroke="#1A82F6"
                dot={false}
                name="Control Loop 1 Output"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="controlLoop2Output"
                stroke="#4ADE80"
                dot={false}
                name="Control Loop 2 Output"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

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
                <YAxis
                  domain={[0, 'auto']}
                  tickFormatter={(value) => value.toFixed(2)}
                />
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
                  strokeWidth={2}
                  isAnimationActive={false}
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
                <YAxis
                  domain={[-2, 2]}
                  tickFormatter={(value) => value.toFixed(2)}
                />
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
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
            <div>Connected Nodes: {connectedNodes.length}</div>
            <div>Avg. Latency: {connectedNodes.length ?
              (connectedNodes.reduce((sum, n) => sum + n.latency, 0) / connectedNodes.length).toFixed(0)
              : 'N/A'} ms</div>
          </div>
        </div>
      </div>
    </Card>
  );
};