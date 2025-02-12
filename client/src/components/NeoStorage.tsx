import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, File } from "lucide-react";
import { uploadToNeoFS, listNeoFSFiles, downloadNeoFSFile, type NeoFSFile } from "@/lib/neoStorage";
import { useIntl } from 'react-intl';

export function NeoStorage() {
  const [uploadLoading, setUploadLoading] = useState(false);
  const { address } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const intl = useIntl();

  // Query for listing files
  const { data: files = [], isLoading } = useQuery<NeoFSFile[]>({
    queryKey: [`/api/neo-storage/files/${address}`],
    enabled: !!address,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!address) throw new Error("Please connect your wallet");
      return uploadToNeoFS(file, address);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/neo-storage/files/${address}`] });
      toast({
        title: "Success",
        description: "File uploaded successfully to Neo FS",
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

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(true);
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle file download
  const handleDownload = async (file: NeoFSFile) => {
    if (!address) return;

    try {
      const blob = await downloadNeoFSFile(file.id, address);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  if (!address) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Neo FS Storage</h2>
        <Input
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          id="neo-fs-upload"
          disabled={uploadLoading}
        />
        <label htmlFor="neo-fs-upload">
          <Button variant="outline" asChild disabled={uploadLoading}>
            <span>
              {uploadLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload to Neo FS
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No files stored in Neo FS yet
          </p>
        ) : (
          <div className="grid gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center space-x-4">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
