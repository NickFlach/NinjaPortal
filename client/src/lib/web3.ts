import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { createPublicClient, defineChain } from 'viem';

// Define NEO X network
export const neoXChain = defineChain({
  id: 47763, // NEO X Chain ID
  network: 'neo-x',
  name: 'NEO X',
  nativeCurrency: {
    name: 'GAS',
    symbol: 'GAS',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mainnet-1.rpc.banelabs.org'] },
    public: { http: ['https://mainnet-1.rpc.banelabs.org'] },
  },
  blockExplorers: {
    default: {
      name: 'NEO X Explorer',
      url: 'https://explorer.neo-x.network',
    },
  },
  testnet: false,
});

// Create a public client
const publicClient = createPublicClient({
  chain: neoXChain,
  transport: http(),
});

// Create wagmi config with NEO X chain
export const config = createConfig({
  chains: [neoXChain],
  transports: {
    [neoXChain.id]: http(),
  },
  connectors: [
    injected({
      // Use a function that safely checks for wallet type
      target: () => {
        // Check for Opera Wallet first (both mobile and desktop)
        if (typeof window !== 'undefined' && 
            (window.ethereum?.isOpera || 
             /OPR|Opera/.test(navigator.userAgent) || 
             (navigator.userAgent.match(/iPhone|iPad|iPod/i) && window.ethereum?.isOpera))) {
          return 'opera';
        }
        // Default to MetaMask
        return 'metaMask';
      }
    }),
  ],
});

// Helper function to detect Opera Wallet
export const isOperaWallet = () => {
  return typeof window !== 'undefined' && (
    window.ethereum?.isOpera || 
    /OPR|Opera/.test(navigator.userAgent) || 
    (navigator.userAgent.match(/iPhone|iPad|iPod/i) && window.ethereum?.isOpera)
  );
};

// Helper functions
export const isConnected = () => {
  return Boolean(config.state.connections.size);
};

export const getAccount = () => {
  if (!isConnected()) return null;
  const connections = Array.from(config.state.connections);
  if (!connections.length) return null;
  const [, connection] = connections[0];
  return connection?.accounts[0];
};

export const getBalance = async (address: `0x${string}`) => {
  if (!isConnected()) return BigInt(0);
  return publicClient.getBalance({ address });
};

// NEO X Network Management
export const addNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${neoXChain.id.toString(16)}`,
          chainName: neoXChain.name,
          nativeCurrency: neoXChain.nativeCurrency,
          rpcUrls: neoXChain.rpcUrls.public.http,
          blockExplorerUrls: [neoXChain.blockExplorers.default.url],
        },
      ],
    });
    return true;
  } catch (error: any) {
    console.error('Error adding NEO X network:', error);
    // Handle Opera-specific errors
    if (isOperaWallet() && error.code === 4001) {
      throw new Error('Please approve the network addition in your Opera Wallet');
    }
    throw error;
  }
};

export const switchToNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${neoXChain.id.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    // If the error code is 4902, the chain hasn't been added
    if (error.code === 4902) {
      return addNeoXNetwork();
    }
    // Handle Opera-specific network switching
    if (isOperaWallet() && error.code === 4001) {
      throw new Error('Please approve the network switch in your Opera Wallet');
    }
    throw error;
  }
};

// Auto-configure NEO X network
export const autoConfigureNeoXNetwork = async () => {
  try {
    const isCorrectNetwork = await isNeoXNetwork();
    if (!isCorrectNetwork) {
      await switchToNeoXNetwork();
    }
    return true;
  } catch (error) {
    console.error('Error auto-configuring NEO X network:', error);
    throw error;
  }
};

export const isNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) return false;

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === `0x${neoXChain.id.toString(16)}`;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};