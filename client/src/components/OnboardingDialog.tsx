import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, ArrowRight, Loader2, CloudCog } from "lucide-react";

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function OnboardingDialog({ isOpen, onClose, walletAddress }: OnboardingDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSkip = () => {
    onClose();
  };

  const handleCreateAccount = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/users/register", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create IPFS account');
      }

      const data = await response.json();

      if (!data.ipfsAccount) {
        throw new Error('IPFS account creation failed');
      }

      toast({
        title: "Success!",
        description: "Your Pinata IPFS account has been created.",
      });
      onClose();
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create your IPFS account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCog className="h-6 w-6 text-primary" />
            Welcome to Music Portal
          </DialogTitle>
          <DialogDescription>
            Create your personal IPFS storage account powered by Pinata to upload and manage your music library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold">With a Pinata Account:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Upload and manage your own music library</li>
              <li>• Create and share playlists</li>
              <li>• Access the global music discovery feed</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold">Without an Account:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Listen to music from the discovery feed</li>
              <li>• Limited to discovery feed features only</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={handleCreateAccount} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create IPFS Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={handleSkip} 
            className="w-full" 
            disabled={isLoading}
          >
            Skip for Now
          </Button>

          <a 
            href="https://www.pinata.cloud/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
          >
            Learn more about Pinata IPFS
            <ExternalLink className="h-3 w-3" />
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}