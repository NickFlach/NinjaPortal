import { Layout } from "@/components/Layout";
import { useEffect, useState } from 'react';
import { useDimensionalTranslation } from "@/contexts/LocaleContext";

// Type for translated list items to avoid repetitive translation calls
interface TranslatedListItems {
  techServes?: string;
  economicModels?: string;
  communityDriven?: string;
}

export default function Whitepaper() {
  const { t } = useDimensionalTranslation();
  const [translatedContent, setTranslatedContent] = useState<{
    title?: string;
    lead?: string;
    sections?: Record<string, string>;
    capabilities?: {
      dataless?: string;
      web3?: string;
      quantum?: string;
      selfHealing?: string;
      testing?: string;
    };
    listItems?: TranslatedListItems;
  }>({});

  useEffect(() => {
    window.scrollTo(0, 0);

    // Translate content using our dimensional translation system
    const translated = {
      title: t('whitepaper.title'),
      lead: t('whitepaper.summary'),
      sections: {
        intro: t('The Evolutionary AI-Powered Music & Intelligence Network'),
        foundation: t('In an age where technology doesn\'t just reshape industries but the very core of human experience, we are forging a new evolutionary paradigm—where music, AI, and decentralized intelligence coalesce into a living system, validated through comprehensive testing and expert verification.'),
        capabilities: t('Core System Capabilities & Validation'),
        lumiraAI: t('whitepaper.ai.lumira'),
        technicalArch: t('whitepaper.arch.title'),
        roadmap: t('whitepaper.roadmap.title'),
        bigPicture: t('The Big Picture: Beyond Music, Toward Collective Intelligence'),
        conclusion: t('This is More Than Music—This is a Symphony of Intelligence. And you are part of it.'),
        testing: t('Rigorous Capability Testing')
      },
      capabilities: {
        dataless: t('whitepaper.storage.ipfs.hybrid'),
        web3: t('whitepaper.contracts.treasury'),
        quantum: t('whitepaper.cascade.description'),
        selfHealing: t('whitepaper.sync.topology.mesh'),
        testing: t('whitepaper.challenges.election.raft')
      },
      listItems: {
        techServes: t('Technology serves human progress, rather than extracting from it'),
        economicModels: t('Economic models regenerate value rather than concentrating wealth'),
        communityDriven: t('Community-driven governance ensures transparency, accountability, and autonomy')
      }
    };

    setTranslatedContent(translated);
  }, [t]);

  return (
    <Layout>
      <div className="prose prose-invert max-w-4xl mx-auto">
        <h1>{translatedContent.title}</h1>
        <p className="lead">{translatedContent.lead}</p>

        <h2>🌍 {translatedContent.sections?.intro}</h2>
        <p>{translatedContent.sections?.foundation}</p>
        <ul>
          <li>{translatedContent.listItems?.techServes}</li>
          <li>{translatedContent.listItems?.economicModels}</li>
          <li>{translatedContent.listItems?.communityDriven}</li>
        </ul>

        <h3>✨ {translatedContent.sections?.capabilities}</h3>
        <ul>
          <li><strong>Data-less Intelligence:</strong> {translatedContent.capabilities?.dataless}</li>
          <li><strong>Web3 & Decentralized Governance:</strong> {translatedContent.capabilities?.web3}</li>
          <li><strong>Quantum-Ready Architecture:</strong> {translatedContent.capabilities?.quantum}</li>
          <li><strong>Self-Healing Evolution:</strong> {translatedContent.capabilities?.selfHealing}</li>
          <li><strong>Rigorous Testing:</strong> {translatedContent.capabilities?.testing}</li>
        </ul>

        {/* Testing Section */}
        <div className="bg-accent/20 p-6 rounded-lg mb-8">
          <h2 className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            {translatedContent.sections?.testing}
          </h2>
          <h4>Multi-Stage Validation Process</h4>
          <ul>
            <li>Expert-Driven Evaluation
              <ul>
                <li>{t('whitepaper.challenges.rate.title')}</li>
                <li>{t('whitepaper.challenges.rate.adaptive')}</li>
                <li>{t('whitepaper.challenges.rate.backoff')}</li>
                <li>{t('whitepaper.challenges.rate.jitter')}</li>
              </ul>
            </li>
            <li>Capability Assessment
              <ul>
                <li>{t('whitepaper.challenges.election.title')}</li>
                <li>{t('whitepaper.challenges.election.raft')}</li>
                <li>{t('whitepaper.challenges.election.failover')}</li>
                <li>{t('whitepaper.challenges.election.transfer')}</li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="bg-accent/20 p-6 rounded-lg mb-8">
          <h2 className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            {translatedContent.sections?.lumiraAI}
          </h2>
          <h4>{t('whitepaper.sync.title')}</h4>
          <ul>
            <li>{t('whitepaper.sync.topology.title')}
              <ul>
                <li>{t('whitepaper.sync.topology.mesh')}</li>
                <li>{t('whitepaper.sync.topology.cluster')}</li>
                <li>{t('whitepaper.sync.topology.redundant')}</li>
                <li>{t('whitepaper.storage.neofs.redundancy')}</li>
              </ul>
            </li>
            <li>{t('whitepaper.sync.state.title')}
              <ul>
                <li>{t('whitepaper.sync.state.timestamp')}</li>
                <li>{t('whitepaper.sync.state.election')}</li>
                <li>{t('whitepaper.sync.state.merkle')}</li>
                <li>{t('whitepaper.storage.neofs.integrity')}</li>
              </ul>
            </li>
          </ul>
        </div>

        <h2>💠 {translatedContent.sections?.technicalArch}</h2>
        <h3>{t('whitepaper.contracts.title')}</h3>
        <ul>
          <li>
            <strong>📜 {t('whitepaper.contracts.treasury')}</strong>
            <ul>
              <li>{t('whitepaper.contracts.upload')}</li>
              <li>{t('whitepaper.contracts.playlist')}</li>
              <li>{t('whitepaper.contracts.nft')}</li>
              <li>{t('whitepaper.contracts.neofs')}</li>
            </ul>
          </li>
          <li>
            <strong>📂 {t('whitepaper.storage.title')}</strong>
            <ul>
              <li>{t('whitepaper.storage.neofs.address')}</li>
              <li>{t('whitepaper.storage.neofs.redundancy')}</li>
              <li>{t('whitepaper.storage.neofs.geo')}</li>
              <li>{t('whitepaper.storage.ipfs.hybrid')}</li>
            </ul>
          </li>
        </ul>

        <h2>📅 {translatedContent.sections?.roadmap}</h2>
        <div className="space-y-4">
          <div>
            <h3>🚀 {t('whitepaper.roadmap.resilience.title')}</h3>
            <ul>
              <li>{t('whitepaper.roadmap.resilience.targets.errors')}</li>
              <li>{t('whitepaper.roadmap.resilience.targets.uptime')}</li>
              <li>{t('whitepaper.roadmap.resilience.targets.fallback')}</li>
              <li>{t('whitepaper.storage.ipfs.gateway')}</li>
            </ul>
          </div>

          <div>
            <h3>🌍 {t('whitepaper.storage.title')}</h3>
            <ul>
              <li>{t('whitepaper.storage.ipfs.hybrid')}</li>
              <li>{t('whitepaper.storage.ipfs.gateway')}</li>
              <li>{t('whitepaper.storage.ipfs.cache')}</li>
              <li>{t('whitepaper.storage.neofs.geo')}</li>
            </ul>
          </div>
        </div>

        <h2>🌌 {translatedContent.sections?.bigPicture}</h2>
        <p>
          {t('whitepaper.cascade.description')}
        </p>
        <ul>
          <li>✅ {t('whitepaper.cascade.inner.sync')}</li>
          <li>✅ {t('whitepaper.cascade.outer.sync')}</li>
          <li>✅ {t('whitepaper.cascade.inner.gain')}</li>
          <li>✅ {t('whitepaper.cascade.outer.gain')}</li>
        </ul>

        <p className="text-xl font-semibold mt-8">
          🎼 {translatedContent.sections?.conclusion}
        </p>
      </div>
    </Layout>
  );
}