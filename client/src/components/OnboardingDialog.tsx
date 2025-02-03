import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CloudCog, Loader2 } from "lucide-react";
import { useState } from "react";

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: (hasAccount: boolean) => void;
  walletAddress: string;
}

export function OnboardingDialog({ isOpen, onClose, walletAddress }: OnboardingDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createIPFSAccount = async () => {
    if (isCreating || !walletAddress) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/users/register", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create IPFS account');
      }

      if (!data.ipfsAccount) {
        throw new Error('IPFS account creation failed');
      }

      toast({
        title: "Welcome to Music Portal!",
        description: "Your IPFS account has been created successfully.",
      });

      onClose(true);
    } catch (error) {
      console.error('IPFS account creation failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create IPFS account",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isCreating && !open && onClose(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudCog className="h-6 w-6 text-primary" />
            Welcome to Music Portal
          </DialogTitle>
          <DialogDescription>
            Create your personal IPFS storage account to upload and manage your music library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold">With an IPFS Account:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Upload and manage your own music</li>
              <li>• Create and share playlists</li>
              <li>• Access the global music feed</li>
            </ul>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h4 className="font-semibold">Without an Account:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Listen to music from the discovery feed</li>
              <li>• Limited to basic features only</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={createIPFSAccount}
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create IPFS Account'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={isCreating}
            className="w-full"
          >
            Skip for Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}