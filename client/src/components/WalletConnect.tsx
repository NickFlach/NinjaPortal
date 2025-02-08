import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';
import { isOperaWallet, autoConfigureNeoXNetwork } from "@/lib/web3";

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
        if (typeof window.ethereum !== 'undefined') {
          await connect({ connector: injected() });
        } else {
          // For Opera mobile browser, check if it's Opera first
          if (isOperaWallet()) {
            toast({
              title: "Opera Wallet",
              description: "Please use the built-in wallet in your Opera browser",
            });
            return;
          }
          // Otherwise redirect to MetaMask app
          const metamaskAppDeepLink = 'https://metamask.app.link/dapp/' + window.location.host;
          window.location.href = metamaskAppDeepLink;
          toast({
            title: "Opening MetaMask App",
            description: "Please open this site in the MetaMask browser after installation",
          });
          return;
        }
      } else {
        // Desktop flow
        if (typeof window.ethereum === 'undefined') {
          if (isOperaWallet()) {
            toast({
              title: "Opera Wallet Required",
              description: "Please enable the Opera Wallet in your browser settings",
              variant: "destructive",
            });
          } else {
            window.open('https://metamask.io/download/', '_blank');
            toast({
              title: "Web3 Wallet Required",
              description: "Please install MetaMask to connect",
              variant: "destructive",
            });
          }
          return;
        }

        await connect({ connector: injected() });
      }

      // Initial delay to allow wallet connection to settle
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Get wallet address with retries
      let connectedAddress = null;
      for (let i = 0; i < 5; i++) {
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
          description: isOperaWallet() 
            ? "Please approve the network setup in Opera Wallet..."
            : "Configuring NEO X network...",
        });
        await autoConfigureNeoXNetwork();
      } catch (error: any) {
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
      for (let i = 0; i < 3; i++) {
        try {
          registrationData = await registerUser(connectedAddress);
          registrationSuccess = true;
          break;
        } catch (error) {
          console.error('Registration attempt', i + 1, 'failed:', error);
          if (i === 2) {
            toast({
              title: "Registration Error",
              description: error instanceof Error ? error.message : "Failed to register wallet. Please try again.",
              variant: "destructive",
            });
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!registrationSuccess || !registrationData) {
        throw new Error("Failed to register after multiple attempts");
      }

      setLocation('/home');

      toast({
        title: "Connected",
        description: registrationData.user.lastSeen 
          ? isOperaWallet() ? "Welcome back to Opera Wallet!" : "Welcome back!" 
          : "Wallet connected successfully!",
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