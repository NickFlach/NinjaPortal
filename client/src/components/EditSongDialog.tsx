import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
}

interface EditSongDialogProps {
  song?: Song;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  onSubmit?: (data: { title: string; artist: string }) => void;
  fileSize?: number; // Add file size for GAS calculation
  onGasConfirm?: () => void; // Callback when GAS payment is confirmed
}

export function EditSongDialog({ 
  song, 
  open, 
  onOpenChange,
  mode,
  onSubmit,
  fileSize,
  onGasConfirm 
}: EditSongDialogProps) {
  const [title, setTitle] = React.useState(song?.title || '');
  const [artist, setArtist] = React.useState(song?.artist || '');
  const [gasAmount, setGasAmount] = React.useState<string>('0');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
    }

    // Calculate required GAS if file size is provided
    if (fileSize && mode === 'create') {
      // Call NEO FS service to calculate GAS
      fetch('/api/neo-storage/calculate-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize, duration: 24 }) // 24 hours storage
      })
        .then(res => res.json())
        .then(data => {
          setGasAmount(data.requiredGas);
        })
        .catch(error => {
          console.error('Error calculating GAS:', error);
          toast({
            title: "Error",
            description: "Failed to calculate required GAS",
            variant: "destructive",
          });
        });
    }
  }, [song, fileSize, mode]);

  const editSongMutation = useMutation({
    mutationFn: async (data: { title: string; artist: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/songs/${song?.id}`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: "Success",
        description: "Song updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (mode === 'create' && fileSize) {
      // Confirm GAS payment before proceeding
      const confirmed = window.confirm(
        `This upload requires ${gasAmount} GAS. Do you want to proceed?`
      );

      if (!confirmed) {
        return;
      }

      // Notify parent about GAS confirmation
      onGasConfirm?.();
    }

    if (mode === 'edit') {
      editSongMutation.mutate({ title, artist });
    } else if (onSubmit) {
      onSubmit({ title, artist });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit Song Details' : 'New Song Details'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit' 
                ? 'Update the title and artist for this song.' 
                : `Enter the title and artist for your new song.${
                    fileSize ? ` Required GAS: ${gasAmount}` : ''
                  }`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="artist" className="text-sm font-medium">
                Artist
              </label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!title || !artist || editSongMutation.isPending}
            >
              {mode === 'edit' ? 'Save Changes' : 'Create Song'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}