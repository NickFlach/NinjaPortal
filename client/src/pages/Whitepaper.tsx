import { Layout } from "@/components/Layout";
import { useEffect, useState } from 'react';
import { useLumiraTranslation } from "@/contexts/LocaleContext";

// Type for translated list items to avoid repetitive translation calls
interface TranslatedListItems {
  techServes?: string;
  economicModels?: string;
  communityDriven?: string;
}

interface TranslatedContent {
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
  testing?: {
    evaluation?: string[];
    capability?: string[];
  };
  sync?: {
    title?: string;
    topology?: string[];
    state?: string[];
  };
  roadmap?: {
    resilience?: string[];
    storage?: string[];
  };
  cascade?: {
    description?: string;
    points?: string[];
  };
}

export default function Whitepaper() {
  const { t, isLoading: isTranslating } = useLumiraTranslation();
  const [translatedContent, setTranslatedContent] = useState<TranslatedContent>({});
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Load all translations at once
    const loadTranslations = async () => {
      setIsLoadingContent(true);
      try {
        const translations = {
          title: await t('whitepaper.title'),
          lead: await t('whitepaper.summary'),
          sections: {
            intro: await t('The Evolutionary AI-Powered Music & Intelligence Network'),
            foundation: await t('In an age where technology doesn\'t just reshape industries but the very core of human experience, we are forging a new evolutionary paradigm—where music, AI, and decentralized intelligence coalesce into a living system, validated through comprehensive testing and expert verification.'),
            capabilities: await t('Core System Capabilities & Validation'),
            lumiraAI: await t('whitepaper.ai.lumira'),
            technicalArch: await t('whitepaper.arch.title'),
            roadmap: await t('whitepaper.roadmap.title'),
            bigPicture: await t('The Big Picture: Beyond Music, Toward Collective Intelligence'),
            conclusion: await t('This is More Than Music—This is a Symphony of Intelligence. And you are part of it.'),
            testing: await t('Rigorous Capability Testing')
          },
          capabilities: {
            dataless: await t('whitepaper.storage.ipfs.hybrid'),
            web3: await t('whitepaper.contracts.treasury'),
            quantum: await t('whitepaper.cascade.description'),
            selfHealing: await t('whitepaper.sync.topology.mesh'),
            testing: await t('whitepaper.challenges.election.raft')
          },
          listItems: {
            techServes: await t('Technology serves human progress, rather than extracting from it'),
            economicModels: await t('Economic models regenerate value rather than concentrating wealth'),
            communityDriven: await t('Community-driven governance ensures transparency, accountability, and autonomy')
          },
          testing: {
            evaluation: [
              await t('whitepaper.challenges.rate.title'),
              await t('whitepaper.challenges.rate.adaptive'),
              await t('whitepaper.challenges.rate.backoff'),
              await t('whitepaper.challenges.rate.jitter')
            ],
            capability: [
              await t('whitepaper.challenges.election.title'),
              await t('whitepaper.challenges.election.raft'),
              await t('whitepaper.challenges.election.failover'),
              await t('whitepaper.challenges.election.transfer')
            ]
          },
          sync: {
            title: await t('whitepaper.sync.title'),
            topology: [
              await t('whitepaper.sync.topology.mesh'),
              await t('whitepaper.sync.topology.cluster'),
              await t('whitepaper.sync.topology.redundant'),
              await t('whitepaper.storage.neofs.redundancy')
            ],
            state: [
              await t('whitepaper.sync.state.timestamp'),
              await t('whitepaper.sync.state.election'),
              await t('whitepaper.sync.state.merkle'),
              await t('whitepaper.storage.neofs.integrity')
            ]
          },
          cascade: {
            description: await t('whitepaper.cascade.description'),
            points: [
              await t('whitepaper.cascade.inner.sync'),
              await t('whitepaper.cascade.outer.sync'),
              await t('whitepaper.cascade.inner.gain'),
              await t('whitepaper.cascade.outer.gain')
            ]
          }
        };

        setTranslatedContent(translations);
      } catch (error) {
        console.error('Error loading translations:', error);
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadTranslations();
  }, [t]);

  if (isLoadingContent || isTranslating) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-lg">Loading whitepaper content...</div>
        </div>
      </Layout>
    );
  }

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
                {translatedContent.testing?.evaluation?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
            <li>Capability Assessment
              <ul>
                {translatedContent.testing?.capability?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
          </ul>
        </div>

        <div className="bg-accent/20 p-6 rounded-lg mb-8">
          <h2 className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            {translatedContent.sections?.lumiraAI}
          </h2>
          <h4>{translatedContent.sync?.title}</h4>
          <ul>
            <li>Network Topology
              <ul>
                {translatedContent.sync?.topology?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
            <li>State Management
              <ul>
                {translatedContent.sync?.state?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </li>
          </ul>
        </div>

        <h2>🌌 {translatedContent.sections?.bigPicture}</h2>
        <p>{translatedContent.cascade?.description}</p>
        <ul>
          {translatedContent.cascade?.points?.map((point, index) => (
            <li key={index}>✅ {point}</li>
          ))}
        </ul>

        <p className="text-xl font-semibold mt-8">
          🎼 {translatedContent.sections?.conclusion}
        </p>
      </div>
    </Layout>
  );
}