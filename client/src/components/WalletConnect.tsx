import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';
import { switchToNeoXNetwork, isNeoXNetwork, autoConfigureNeoXNetwork, isOperaWallet } from "@/lib/web3";

export function WalletConnect() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check if the device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const registerUser = async (userAddress: string) => {
    try {
      // Try GET first to check if user exists and get recent songs
      console.log('Checking user registration:', userAddress);
      const response = await apiRequest("GET", "/api/users/register");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Registration check failed");
      }

      if (!data.user) {
        throw new Error("Invalid response from server: missing user data");
      }

      console.log('User registered:', data.user);
      console.log('Recent songs:', data.recentSongs);

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const handleConnect = async () => {
    try {
      // Check if we're on mobile
      if (isMobile) {
        // Check if MetaMask app is installed via deep link
        const metamaskAppDeepLink = 'https://metamask.app.link/dapp/' + window.location.host;

        // First try to connect to injected provider in case MetaMask or Opera is available
        if (typeof window.ethereum !== 'undefined') {
          await connect({ 
            connector: injected({
              target: ({ type }) => {
                // Check for Opera Wallet first
                if (type === 'opera' || window.ethereum?.isOpera) {
                  return 'opera';
                }
                // Default to MetaMask
                return 'metaMask';
              }
            })
          });
        } else {
          // If no injected provider, redirect to MetaMask app
          window.location.href = metamaskAppDeepLink;
          toast({
            title: "Opening MetaMask App",
            description: "Please open this site in the MetaMask browser after installation",
          });
          return;
        }
      } else {
        // Desktop flow - check for wallet extensions
        if (typeof window.ethereum === 'undefined') {
          window.open('https://metamask.io/download/', '_blank');
          toast({
            title: "Web3 Wallet Required",
            description: "Please install MetaMask or Opera Wallet to connect",
            variant: "destructive",
          });
          return;
        }

        // Connect using the extension
        await connect({ 
          connector: injected({
            target: ({ type }) => {
              if (type === 'opera' || window.ethereum?.isOpera) {
                return 'opera';
              }
              return 'metaMask';
            }
          })
        });
      }

      // Initial delay to allow wallet connection to settle
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get wallet address with retries
      let connectedAddress = null;
      for (let i = 0; i < 5; i++) { // Try for up to 5 seconds (5 * 1000ms)
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          connectedAddress = accounts[0];
          if (connectedAddress) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.log('Attempt', i + 1, 'to get address failed:', err);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!connectedAddress) {
        throw new Error("Failed to get wallet address after connection");
      }

      // Auto-configure NEO X network
      try {
        toast({
          title: "Network Setup",
          description: "Configuring NEO X network...",
        });
        await autoConfigureNeoXNetwork();
      } catch (error: any) {
        // Show network configuration error but don't stop the flow
        toast({
          title: "Network Warning",
          description: isOperaWallet() 
            ? "Please approve the network switch in your Opera Wallet"
            : "Please make sure you're connected to the NEO X network",
          variant: "destructive",
        });
      }

      console.log('Making request with wallet address:', connectedAddress);

      // Registration with retries
      let registrationSuccess = false;
      let registrationData = null;
      for (let i = 0; i < 3; i++) { // Try registration up to 3 times
        try {
          registrationData = await registerUser(connectedAddress);
          registrationSuccess = true;
          break;
        } catch (error) {
          console.error('Registration attempt', i + 1, 'failed:', error);
          if (i === 2) { // Only show error toast on final attempt
            toast({
              title: "Registration Error",
              description: error instanceof Error ? error.message : "Failed to register wallet. Please try again.",
              variant: "destructive",
            });
            throw error; // Re-throw on final attempt
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!registrationSuccess || !registrationData) {
        throw new Error("Failed to register after multiple attempts");
      }

      // Redirect to home page
      setLocation('/home');

      toast({
        title: "Connected",
        description: registrationData.user.lastSeen ? "Welcome back!" : "Wallet connected successfully!",
      });

    } catch (error) {
      console.error('Wallet connection error:', error);
      if (error instanceof Error && !error.message.includes('Failed to get wallet address')) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setLocation('/');
      toast({
        title: "Disconnected",
        description: "Wallet disconnected successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      {!address ? (
        <Button onClick={handleConnect}>Connect Wallet</Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <Button variant="outline" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </div>
  );
}