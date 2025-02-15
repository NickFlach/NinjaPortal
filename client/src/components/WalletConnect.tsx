import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from 'wouter';
import { isOperaWallet, isMobileDevice, autoConfigureNeoXNetwork } from "@/lib/web3";
import { useIntl } from 'react-intl';
import { useDevice } from "@/hooks/use-mobile";

export function WalletConnect() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const intl = useIntl();
  const { isMobile } = useDevice();

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
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const handleConnect = async () => {
    try {
      // Check if we're on mobile and guide users accordingly
      if (isMobile && !window.ethereum) {
        // Provide mobile-specific wallet guidance
        toast({
          title: intl.formatMessage({ id: 'app.network.setup' }),
          description: isOperaWallet()
            ? intl.formatMessage({ id: 'app.network.opera.install' })
            : intl.formatMessage({ id: 'app.network.mobile.install' }),
          variant: "destructive",
        });
        return;
      }

      // Always try to connect using injected provider first
      if (typeof window.ethereum !== 'undefined') {
        await connect({ connector: injected() });
      } else {
        // If no wallet is available, show instructions
        toast({
          title: intl.formatMessage({ id: 'app.network.setup' }),
          description: intl.formatMessage({ id: 'app.network.install' }),
          variant: "destructive",
        });
        return;
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
          title: intl.formatMessage({ id: 'app.network.setup' }),
          description: isOperaWallet() 
            ? intl.formatMessage({ id: 'app.network.opera' })
            : intl.formatMessage({ id: 'app.network.configuring' }),
        });
        await autoConfigureNeoXNetwork();
      } catch (error: any) {
        toast({
          title: intl.formatMessage({ id: 'app.network.warning' }),
          description: isOperaWallet() 
            ? intl.formatMessage({ id: 'app.network.switch' })
            : intl.formatMessage({ id: 'app.network.connect' }),
          variant: "destructive",
        });
        return; // Stop here if network configuration fails
      }

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
        title: intl.formatMessage({ id: 'app.connect' }),
        description: registrationData.user.lastSeen 
          ? isOperaWallet() 
            ? intl.formatMessage({ id: 'app.welcome.opera' })
            : intl.formatMessage({ id: 'app.welcome.back' })
          : intl.formatMessage({ id: 'app.welcome.new' }),
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
        title: intl.formatMessage({ id: 'app.disconnect' }),
        description: intl.formatMessage({id: 'app.disconnect.success'}),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: intl.formatMessage({id: 'app.disconnect.error'}),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center">
      {!address ? (
        <Button 
          onClick={handleConnect}
          className="truncate max-w-[120px] md:max-w-none text-sm"
        >
          {intl.formatMessage({ id: 'app.connect' })}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[60px] md:max-w-[80px]">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <Button 
            variant="outline" 
            onClick={handleDisconnect}
            className="text-xs md:text-sm px-2 md:px-3"
          >
            {intl.formatMessage({ id: 'app.disconnect' })}
          </Button>
        </div>
      )}
    </div>
  );
}