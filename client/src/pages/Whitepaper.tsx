
import { useEffect } from 'react';

export default function Whitepaper() {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 prose prose-invert max-w-4xl">
      <h1>Decentralized Music Streaming Platform White Paper</h1>
      
      <h2>Executive Summary</h2>
      <p>The platform is a decentralized music streaming application leveraging blockchain technology, IPFS for storage, and advanced network synchronization for collaborative listening experiences.</p>

      <h2>Technical Architecture</h2>
      <h3>Core Components</h3>
      
      <h4>Smart Contracts</h4>
      <ul>
        <li><strong>MusicTreasury.sol</strong>: Manages token rewards and treasury functions
          <ul>
            <li>Upload Reward: 1 PFORK</li>
            <li>Playlist Reward: 2 PFORK</li>
            <li>NFT Reward: 3 PFORK</li>
          </ul>
        </li>
        <li><strong>NeoFsManager.sol</strong>: Handles decentralized storage</li>
      </ul>

      <h4>Network Synchronization</h4>
      <p>The platform implements a cascade controller system for synchronized playback with statistical physics principles.</p>

      <h2>Network Architecture</h2>
      <h3>WebSocket Protocol</h3>
      <ul>
        <li>Path: /ws/music-sync</li>
        <li>Message Types: auth, subscribe, sync, location_update</li>
      </ul>

      <h2>Technical Challenges and Solutions</h2>
      <h3>Playback Synchronization</h3>
      <ul>
        <li>Implement rate limiting for playback adjustments</li>
        <li>Add connection heartbeat system</li>
        <li>Introduce consensus mechanism for leader election</li>
      </ul>

      <h2>Roadmap</h2>
      <h3>Network Resilience</h3>
      <ul>
        <li>Reduce sync errors by 90%</li>
        <li>Achieve 99.9% uptime</li>
        <li>Implement fallback mechanisms</li>
      </ul>

      <h3>Storage Optimization</h3>
      <ul>
        <li>Reduce storage costs by 50%</li>
        <li>Implement file compression</li>
        <li>Add content delivery optimization</li>
      </ul>
    </div>
  );
}
