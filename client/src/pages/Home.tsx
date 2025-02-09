import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MusicPlayer } from "@/components/MusicPlayer";
import { Layout } from "@/components/Layout";
import { useAccount } from 'wagmi';
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { MusicVisualizer } from "@/components/MusicVisualizer";
import { SongCard } from "@/components/SongCard";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Library, Loader2 } from "lucide-react";
import { uploadToIPFS } from "@/lib/ipfs";
import { EditSongDialog } from "@/components/EditSongDialog";
import { useIntl } from 'react-intl';

interface Song {
  id: number;
  title: string;
  artist: string;
  ipfsHash: string;
  uploadedBy: string | null;
  createdAt: string | null;
  votes: number | null;
}

export default function Home() {
  const intl = useIntl();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<File>();
  const { toast } = useToast();
  const { address } = useAccount();
  const { playSong, currentSong, recentSongs } = useMusicPlayer();
  const queryClient = useQueryClient();

  const handleBackgroundClick = () => {
    const baseUrl = window.location.origin;
    const redirectUrl = address
      ? `${baseUrl}?wallet=${address}`
      : baseUrl;
    window.location.href = redirectUrl;
  };

  const { data: librarySongs, isLoading: libraryLoading } = useQuery<Song[]>({
    queryKey: ["/api/songs/library"],
    enabled: !!address,
  });

  const playMutation = useMutation({
    mutationFn: async (songId: number) => {
      if (!address) {
        throw new Error("Please connect your wallet to play songs");
      }

      try {
        const registerResponse = await apiRequest("POST", "/api/users/register", {
          address,
          geolocation: null 
        });

        if (!registerResponse.ok) {
          throw new Error("Failed to register user");
        }

        const registerData = await registerResponse.json();
        console.log('Registration successful before play:', registerData);

        await apiRequest("POST", `/api/songs/play/${songId}`);
      } catch (error) {
        console.error('Play mutation error:', error);
        throw error instanceof Error ? error : new Error('Unknown error during play');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
    },
  });

  const handlePlaySong = async (song: Song, context: 'library' | 'feed' = 'feed') => {
    if (!address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to play songs",
        variant: "destructive",
      });
      return;
    }

    try {
      playSong(song, context);
      await playMutation.mutate(song.id);
    } catch (error) {
      console.error('Error playing song:', error);
      toast({
        title: "Error",
        description: "Failed to play song. Please try again.",
        variant: "destructive",
      });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title, artist }: { file: File; title: string; artist: string }) => {
      if (!address) {
        throw new Error(intl.formatMessage({ id: 'app.errors.wallet' }));
      }

      try {
        const registerResponse = await apiRequest("POST", "/api/users/register", {
          address,
          geolocation: null
        });

        if (!registerResponse.ok) {
          throw new Error("Failed to register user");
        }

        const registerData = await registerResponse.json();
        console.log('Registration successful:', registerData);

        toast({
          title: intl.formatMessage({ id: 'app.upload.started' }),
          description: intl.formatMessage({ id: 'app.upload.progress' }),
        });

        try {
          console.log('Starting IPFS upload for file:', {
            name: file.name,
            size: file.size,
            type: file.type
          });

          const ipfsHash = await uploadToIPFS(file);
          console.log('IPFS upload successful, hash:', ipfsHash);

          const response = await apiRequest("POST", "/api/songs", {
            title,
            artist,
            ipfsHash,
          });
          return await response.json();
        } catch (error) {
          console.error('Upload error:', error);
          throw error instanceof Error ? error : new Error('Unknown upload error');
        }
      } catch (error) {
        console.error('Registration/Upload error:', error);
        throw error instanceof Error ? error : new Error('Unknown error during registration or upload');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs/library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/songs/recent"] });
      toast({
        title: intl.formatMessage({ id: 'app.upload.success' }),
        description: intl.formatMessage({ id: 'app.upload.success' }),
      });
      setPendingUpload(undefined);
      setUploadDialogOpen(false);
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const file = e.target.files[0];

    if (file.type !== 'audio/mpeg') {
      toast({
        title: "Invalid File Type",
        description: "Please select an MP3 file. Other audio formats are not supported.",
        variant: "destructive",
      });
      return;
    }

    setPendingUpload(file);
    setUploadDialogOpen(true);
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-screen">
        <div
          onClick={handleBackgroundClick}
          className="absolute inset-0 z-0 cursor-pointer"
          style={{
            top: '64px',
            bottom: 'auto',
            height: 'calc(30vh)',
          }}
        />

        <section className="h-[30vh] mb-6 relative">
          <MusicVisualizer />
        </section>

        <div className="flex-1 grid grid-cols-1 gap-6 mb-24 relative z-10">
          {address ? (
            <section className="px-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">
                  {intl.formatMessage({ id: 'app.library' })}
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center text-muted-foreground">
                    <Library className="mr-2 h-4 w-4" />
                    {librarySongs?.length || 0} {intl.formatMessage({ id: 'app.songs' })}
                  </div>
                  <Input
                    type="file"
                    accept=".mp3,audio/mpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="song-upload"
                    disabled={uploadMutation.isPending}
                  />
                  <label htmlFor="song-upload">
                    <Button variant="outline" asChild disabled={uploadMutation.isPending}>
                      <span>
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {intl.formatMessage({ id: 'app.upload.progress' })}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {intl.formatMessage({ id: 'app.upload' })}
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                {libraryLoading ? (
                  <p className="text-muted-foreground">Loading your library...</p>
                ) : librarySongs?.length === 0 ? (
                  <p className="text-muted-foreground">No songs in your library yet</p>
                ) : (
                  librarySongs?.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onClick={() => handlePlaySong(song, 'library')}
                      showDelete={true}
                      isPlaying={currentSong?.id === song.id}
                    />
                  ))
                )}
              </div>
            </section>
          ) : null}

          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">
                {intl.formatMessage({ id: 'app.discovery' })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'app.recent' })}
              </p>
            </div>

            <div className="grid gap-2">
              {recentSongs?.length === 0 ? (
                <p className="text-muted-foreground">
                  {intl.formatMessage({ id: 'app.noRecentSongs' })}
                </p>
              ) : (
                recentSongs?.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    onClick={() => handlePlaySong(song, 'feed')}
                    isPlaying={currentSong?.id === song.id}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <EditSongDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setPendingUpload(undefined);
        }}
        mode="create"
        onSubmit={({ title, artist }) => {
          if (pendingUpload) {
            uploadMutation.mutate({
              file: pendingUpload,
              title,
              artist,
            });
          }
        }}
      />
    </Layout>
  );
}