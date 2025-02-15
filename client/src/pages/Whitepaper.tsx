import { Layout } from "@/components/Layout";
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

export default function Whitepaper() {
  const intl = useIntl();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Layout>
      <div className="prose prose-invert max-w-4xl mx-auto">
        <h1>{intl.formatMessage({ id: 'whitepaper.title' })}</h1>
        <p className="lead">{intl.formatMessage({ id: 'whitepaper.summary' })}</p>

        {/* Lumira AI Assistant Section */}
        <div className="bg-accent/20 p-6 rounded-lg mb-8">
          <h2 className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            {intl.formatMessage({ id: 'whitepaper.ai.lumira' })}
          </h2>
          <p>{intl.formatMessage({ id: 'whitepaper.ai.lumira.description' })}</p>
        </div>

        <h2>{intl.formatMessage({ id: 'whitepaper.arch.title' })}</h2>
        {/*<p>{intl.formatMessage({ id: 'whitepaper.arch.description' })}</p>*/}
        <h3>Core Components</h3>
        <h4>Smart Contracts</h4>
        <ul>
          <li>
            <strong>MusicTreasury.sol</strong>: Manages token rewards and treasury functions
            <ul>
              <li>Upload Reward: 1 PFORK - Incentivizes content contribution</li>
              <li>Playlist Reward: 2 PFORK - Encourages curation and discovery</li>
              <li>NFT Reward: 3 PFORK - Promotes community ownership</li>
            </ul>
          </li>
          <li>
            <strong>NeoFsManager.sol</strong>: Handles decentralized storage
            <ul>
              <li>Implements content-addressed storage using NEO FS</li>
              <li>Manages file integrity verification</li>
              <li>Handles storage node incentivization</li>
            </ul>
          </li>
        </ul>

        <h4>Cascade Control System</h4>
        <p>The platform implements an advanced cascade controller system for synchronized playback, based on principles from statistical physics and control theory.</p>

        <h5>Controller Architecture</h5>
        <ul>
          <li><strong>Inner Loop (Entropy Control)</strong>
            <ul>
              <li>Manages local playback synchronization</li>
              <li>Implements anti-windup mechanisms</li>
              <li>Uses adaptive gain scheduling</li>
              <li>Features low-pass filtered derivative action</li>
            </ul>
          </li>
          <li><strong>Outer Loop (Free Energy Control)</strong>
            <ul>
              <li>Coordinates global network synchronization</li>
              <li>Implements conservative gain adaptation</li>
              <li>Features oscillation detection and damping</li>
              <li>Uses steady-state error compensation</li>
            </ul>
          </li>
        </ul>

        <h4>NEO Blockchain Integration</h4>
        <ul>
          <li><strong>Network Configuration</strong>
            <ul>
              <li>Chain ID: 47763</li>
              <li>Native Currency: GAS</li>
              <li>RPC Endpoint: https://mainnet-1.rpc.banelabs.org</li>
            </ul>
          </li>
          <li><strong>Wallet Integration</strong>
            <ul>
              <li>Multi-wallet support (MetaMask, Opera)</li>
              <li>Automatic network configuration</li>
              <li>Fallback connection handling</li>
            </ul>
          </li>
        </ul>

        <h4>Lumira AI Integration</h4>
        <p>Lumira AI is a core component of our system, providing:</p>
        <ul>
          <li>Real-time music synchronization optimization</li>
          <li>Network topology optimization</li>
          <li>Predictive caching strategies</li>
          <li>Adaptive quality control</li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.network.title' })}</h2>
        {/*<p>{intl.formatMessage({ id: 'whitepaper.network.description' })}</p>*/}
        <h3>WebSocket Protocol</h3>
        <h4>Connection Management</h4>
        <ul>
          <li><strong>Authentication Flow</strong>
            <ul>
              <li>Wallet signature verification</li>
              <li>Session token management</li>
              <li>Heartbeat mechanism</li>
            </ul>
          </li>
          <li><strong>Message Types</strong>
            <ul>
              <li>auth: Initial authentication and session establishment</li>
              <li>subscribe: Join music synchronization groups</li>
              <li>sync: Playback state synchronization</li>
              <li>location_update: Geographical node mapping</li>
            </ul>
          </li>
        </ul>

        <h3>Synchronization Protocol</h3>
        <ul>
          <li><strong>State Management</strong>
            <ul>
              <li>Distributed timestamp synchronization</li>
              <li>Leader election using Byzantine fault tolerance</li>
              <li>State merkle tree verification</li>
            </ul>
          </li>
          <li><strong>Network Topology</strong>
            <ul>
              <li>Dynamic mesh network formation</li>
              <li>Geographical node clustering</li>
              <li>Redundant connection paths</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.storage.title' })}</h2>
        {/*<p>{intl.formatMessage({ id: 'whitepaper.storage.description' })}</p>*/}
        <h3>Content Distribution</h3>
        <ul>
          <li><strong>NEO FS Integration</strong>
            <ul>
              <li>Content-addressed storage</li>
              <li>Redundancy factor: 3x</li>
              <li>Geographic distribution</li>
            </ul>
          </li>
          <li><strong>IPFS Fallback</strong>
            <ul>
              <li>Hybrid storage approach</li>
              <li>Gateway redundancy</li>
              <li>Cache management</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.challenges.title' })}</h2>
        <h3>Playback Synchronization</h3>
        <ul>
          <li><strong>Rate Limiting and Adaptation</strong>
            <ul>
              <li>Adaptive rate limiting based on network conditions</li>
              <li>Exponential backoff for reconnection attempts</li>
              <li>Jitter buffer management</li>
            </ul>
          </li>
          <li><strong>Connection Management</strong>
            <ul>
              <li>Heartbeat interval: 30s with 10s grace period</li>
              <li>Connection state machine with 5 distinct states</li>
              <li>Automatic recovery mechanisms</li>
            </ul>
          </li>
          <li><strong>Leader Election</strong>
            <ul>
              <li>RAFT consensus implementation</li>
              <li>Automatic failover with 3-second detection</li>
              <li>State transfer protocol</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.roadmap.title' })}</h2>
        <h3>Network Resilience (Q2 2025)</h3>
        <ul>
          <li><strong>Performance Targets</strong>
            <ul>
              <li>Reduce sync errors by 90% through enhanced PID tuning</li>
              <li>Achieve 99.9% uptime via redundant infrastructure</li>
              <li>Implement N+1 fallback mechanisms</li>
            </ul>
          </li>
        </ul>

        <h3>Storage Optimization (Q3 2025)</h3>
        <ul>
          <li><strong>Efficiency Improvements</strong>
            <ul>
              <li>Reduce storage costs by 50% through smart compression</li>
              <li>Implement adaptive bitrate streaming</li>
              <li>Add edge-cached content delivery</li>
            </ul>
          </li>
        </ul>

        <h3>Future Development</h3>
        <h4>Lumira AI Roadmap</h4>
        <ul>
          <li>Enhanced synchronization with neural network models</li>
          <li>Collaborative filtering for music recommendations</li>
          <li>Automated content moderation</li>
          <li>Cross-chain optimization strategies</li>
        </ul>
      </div>
    </Layout>
  );
}