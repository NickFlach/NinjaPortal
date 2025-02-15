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
        <p>{intl.formatMessage({ id: 'whitepaper.arch.description' })}</p>

        <h3>{intl.formatMessage({ id: 'whitepaper.components.title' })}</h3>
        <h4>{intl.formatMessage({ id: 'whitepaper.contracts.title' })}</h4>
        <ul>
          <li>
            <strong>MusicTreasury.sol</strong>: {intl.formatMessage({ id: 'whitepaper.contracts.treasury' })}
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.upload' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.playlist' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.nft' })}</li>
            </ul>
          </li>
          <li>
            <strong>NeoFsManager.sol</strong>: {intl.formatMessage({ id: 'whitepaper.contracts.neofs' })}
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.neofs.storage' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.neofs.integrity' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.contracts.neofs.incentive' })}</li>
            </ul>
          </li>
        </ul>

        <h4>{intl.formatMessage({ id: 'whitepaper.cascade.title' })}</h4>
        <p>{intl.formatMessage({ id: 'whitepaper.cascade.description' })}</p>
        <h5>{intl.formatMessage({ id: 'whitepaper.cascade.arch.title' })}</h5>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.cascade.inner.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.inner.sync' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.inner.antiwindup' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.inner.gain' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.inner.derivative' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.cascade.outer.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.outer.sync' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.outer.gain' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.outer.oscillation' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.cascade.outer.error' })}</li>
            </ul>
          </li>
        </ul>

        <h4>{intl.formatMessage({ id: 'whitepaper.neo.title' })}</h4>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.neo.config.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.config.chainid' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.config.currency' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.config.rpc' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.neo.wallet.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.wallet.support' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.wallet.autoconfig' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.neo.wallet.fallback' })}</li>
            </ul>
          </li>
        </ul>

        <h4>{intl.formatMessage({ id: 'whitepaper.lumira.title' })}</h4>
        <p>{intl.formatMessage({ id: 'whitepaper.lumira.features' })}</p>
        <ul>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.sync' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.topology' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.caching' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.quality' })}</li>
        </ul>

        <h3>{intl.formatMessage({ id: 'whitepaper.lumira.future' })}</h3>
        <ul>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.neural' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.filtering' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.moderation' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.crosschain' })}</li>
        </ul>


        <h2>{intl.formatMessage({ id: 'whitepaper.network.title' })}</h2>
        <p>{intl.formatMessage({ id: 'whitepaper.network.description' })}</p>
        <h3>{intl.formatMessage({ id: 'whitepaper.websocket.title' })}</h3>
        <h4>{intl.formatMessage({ id: 'whitepaper.websocket.conn.title' })}</h4>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.websocket.auth.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.auth.verify' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.auth.token' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.auth.heartbeat' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.websocket.msg.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.msg.auth' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.msg.subscribe' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.msg.sync' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.websocket.msg.location' })}</li>
            </ul>
          </li>
        </ul>

        <h3>{intl.formatMessage({ id: 'whitepaper.sync.title' })}</h3>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.sync.state.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.state.timestamp' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.state.election' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.state.merkle' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.sync.topology.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.topology.mesh' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.topology.cluster' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.sync.topology.redundant' })}</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.storage.title' })}</h2>
        <p>{intl.formatMessage({ id: 'whitepaper.storage.description' })}</p>
        <h3>{intl.formatMessage({ id: 'whitepaper.storage.dist.title' })}</h3>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.storage.neofs.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.neofs.address' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.neofs.redundancy' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.neofs.geo' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.storage.ipfs.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.ipfs.hybrid' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.ipfs.gateway' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.storage.ipfs.cache' })}</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.challenges.title' })}</h2>
        <h3>{intl.formatMessage({ id: 'whitepaper.challenges.playback.title' })}</h3>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.challenges.rate.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.rate.adaptive' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.rate.backoff' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.rate.jitter' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.challenges.conn.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.conn.heartbeat' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.conn.state' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.conn.recovery' })}</li>
            </ul>
          </li>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.challenges.election.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.election.raft' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.election.failover' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.challenges.election.transfer' })}</li>
            </ul>
          </li>
        </ul>

        <h2>{intl.formatMessage({ id: 'whitepaper.roadmap.title' })}</h2>
        <h3>{intl.formatMessage({ id: 'whitepaper.roadmap.resilience.title' })}</h3>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.roadmap.resilience.targets.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.resilience.targets.errors' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.resilience.targets.uptime' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.resilience.targets.fallback' })}</li>
            </ul>
          </li>
        </ul>

        <h3>{intl.formatMessage({ id: 'whitepaper.roadmap.storage.title' })}</h3>
        <ul>
          <li><strong>{intl.formatMessage({ id: 'whitepaper.roadmap.storage.improvements.title' })}</strong>
            <ul>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.storage.improvements.costs' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.storage.improvements.bitrate' })}</li>
              <li>{intl.formatMessage({ id: 'whitepaper.roadmap.storage.improvements.edge' })}</li>
            </ul>
          </li>
        </ul>

        <h3>{intl.formatMessage({ id: 'whitepaper.roadmap.future.title' })}</h3>
        <h4>{intl.formatMessage({ id: 'whitepaper.lumira.future.title' })}</h4>
        <ul>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.neural' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.filtering' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.moderation' })}</li>
          <li>{intl.formatMessage({ id: 'whitepaper.lumira.crosschain' })}</li>
        </ul>
      </div>
    </Layout>
  );
}