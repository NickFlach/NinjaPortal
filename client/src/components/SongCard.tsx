import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2, ListMusic, Coins, Edit, Heart, HeartCrack } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useContractWrite, useAccount } from 'wagmi';
import { PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI } from "@/lib/contracts";
import { EditSongDialog } from "./EditSongDialog";
import { useState } from "react";
import { parseEther } from "viem";

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
  creatorMood: 'happy' | 'sad' | 'neutral';
}

interface SongCardProps {
  song: Song;
  onClick: () => void;
  variant?: "ghost" | "default";
  showDelete?: boolean;
  isPlaying?: boolean;
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false, isPlaying = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { address } = useAccount();

  // Query user's reaction to this song
  const { data: userReaction } = useQuery({
    queryKey: [`/api/songs/${song.id}/reaction`, address],
    enabled: !!address,
  });

  // Add/update reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ songId, reaction }: { songId: number; reaction: 'happy' | 'sad' }) => {
      await apiRequest("POST", `/api/songs/${songId}/react`, { reaction });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/songs/${song.id}/reaction`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReaction = (reaction: 'happy' | 'sad') => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to react to songs",
        variant: "destructive",
      });
      return;
    }
    reactionMutation.mutate({ songId: song.id, reaction });
  };

  return (
    <>
      <div className="flex items-center justify-between group">
        <Button
          variant={variant}
          className={`flex-1 justify-start ${isPlaying ? 'bg-primary/10' : ''}`}
          onClick={onClick}
        >
          <span className="truncate">{song.title}</span>
          <span className="ml-2 text-muted-foreground">- {song.artist}</span>
          {song.creatorMood !== 'neutral' && (
            <span className="ml-2 text-muted-foreground">
              {song.creatorMood === 'happy' ? '😊' : '😢'}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`${
              userReaction?.reaction === 'happy' ? 'text-green-500' : ''
            } opacity-0 group-hover:opacity-100 transition-opacity`}
            onClick={() => handleReaction('happy')}
          >
            <Heart className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${
              userReaction?.reaction === 'sad' ? 'text-red-500' : ''
            } opacity-0 group-hover:opacity-100 transition-opacity`}
            onClick={() => handleReaction('sad')}
          >
            <HeartCrack className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {showDelete && (
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
              )}

              {playlists?.map((playlist) => (
                <DropdownMenuItem
                  key={playlist.id}
                  onClick={() => {
                    addToPlaylistMutation.mutate({
                      playlistId: playlist.id,
                      songId: song.id,
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to {playlist.name}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm("Minting an NFT costs 1 GAS. Continue?")) {
                    mintNFTMutation.mutate();
                  }
                }}
                disabled={mintNFTMutation.isPending || !address}
              >
                <Coins className="mr-2 h-4 w-4" />
                Mint as NFT
              </DropdownMenuItem>

              {showDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this song?")) {
                        deleteSongMutation.mutate(song.id);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete from Library
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditSongDialog
        song={song}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
      />
    </>
  );
}