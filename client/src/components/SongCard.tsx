import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, Trash2, ListMusic, Coins, Edit, Heart } from "lucide-react";
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
  likes?: number;
  isLiked?: boolean;
}

interface SongCardProps {
  song: Song;
  onClick: () => void;
  variant?: "ghost" | "default";
  showDelete?: boolean;
}

export function SongCard({ song, onClick, variant = "ghost", showDelete = false }: SongCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { address } = useAccount();

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (songId: number) => {
      const response = await apiRequest("POST", `/api/songs/${songId}/like`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: song.isLiked ? "Unliked" : "Liked",
        description: song.isLiked ? "Song removed from your likes" : "Song added to your likes",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: playlists } = useQuery<Playlist[]>({
    queryKey: ["/api/playlists"],
  });

  // Contract write for minting NFT
  const { writeAsync: mintSongNFT } = useContractWrite({
    address: PLAYLIST_NFT_ADDRESS,
    abi: PLAYLIST_NFT_ABI,
    functionName: 'mintSong',
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: number; songId: number }) => {
      await apiRequest("POST", `/api/playlists/${playlistId}/songs`, { songId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({
        title: "Success",
        description: "Song added to playlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const mintNFTMutation = useMutation({
    mutationFn: async () => {
      if (!mintSongNFT) throw new Error("Contract write not ready");
      if (!address) throw new Error("Wallet not connected");

      const metadataUri = `ipfs://${song.ipfsHash}`;

      try {
        const tx = await mintSongNFT({
          args: [
            address,
            song.title,
            song.artist,
            song.ipfsHash,
            metadataUri
          ],
          value: parseEther("1"), // 1 GAS
        });

        // Wait for transaction confirmation
        await tx.wait();
      } catch (error: any) {
        throw new Error(error.message || "Failed to mint NFT");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "NFT minting initiated. Please wait for the transaction to be mined.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      await apiRequest("DELETE", `/api/songs/${songId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      toast({
        title: "Success",
        description: "Song deleted from library",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <div className="flex items-center justify-between group">
        <Button
          variant={variant}
          className="flex-1 justify-start"
          onClick={onClick}
        >
          <span className="truncate">{song.title}</span>
          <span className="ml-2 text-muted-foreground">- {song.artist}</span>
        </Button>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className={`mr-2 ${song.isLiked ? 'text-red-500' : 'text-muted-foreground'} opacity-0 group-hover:opacity-100 transition-opacity`}
            onClick={() => likeMutation.mutate(song.id)}
          >
            <Heart className={`h-4 w-4 ${song.isLiked ? 'fill-current' : ''}`} />
            {song.likes && song.likes > 0 && (
              <span className="ml-1 text-xs">{song.likes}</span>
            )}
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

              {!playlists?.length ? (
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  <ListMusic className="mr-2 h-4 w-4" />
                  Create a playlist first
                </DropdownMenuItem>
              ) : (
                playlists.map((playlist) => (
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
                ))
              )}

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