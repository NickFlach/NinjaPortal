import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { createPublicClient, defineChain } from 'viem';

// Helper function to detect Opera Wallet - defined before usage
const isOperaWallet = () => {
  try {
    return typeof window !== 'undefined' && (
      window.ethereum?.isOpera || 
      /OPR|Opera/.test(navigator.userAgent)
    );
  } catch {
    return false;
  }
};

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
      target: isOperaWallet() ? 'opera' : 'metaMask'
    })
  ],
});

// Export the Opera detection function
export { isOperaWallet };

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

export const addNeoXNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No web3 wallet detected');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: `0x${neoXChain.id.toString(16)}`,
        chainName: neoXChain.name,
        nativeCurrency: neoXChain.nativeCurrency,
        rpcUrls: neoXChain.rpcUrls.public.http,
        blockExplorerUrls: [neoXChain.blockExplorers.default.url],
      }],
    });
    return true;
  } catch (error: any) {
    console.error('Error adding NEO X network:', error);
    if (isOperaWallet() && error.code === 4001) {
      throw new Error('Please approve the network addition in Opera Wallet');
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
    if (error.code === 4902) {
      return addNeoXNetwork();
    }
    if (isOperaWallet() && error.code === 4001) {
      throw new Error('Please approve the network switch in Opera Wallet');
    }
    throw error;
  }
};

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