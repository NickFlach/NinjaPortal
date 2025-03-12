import { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

/**
 * A test component for verifying IPFS upload functionality
 */
export function IpfsUploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const testPinataConnection = async () => {
    try {
      setIsUploading(true);
      setError(null);
      
      const response = await axios.post('/api/ipfs/test-connection');
      setUploadResult({
        type: 'connection',
        data: response.data
      });
      
      console.log('Pinata connection test result:', response.data);
    } catch (err) {
      console.error('Pinata connection test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error testing connection');
    } finally {
      setIsUploading(false);
    }
  };

  const testUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet', '0xTestWallet123'); // Test wallet address
      
      // Make request to test endpoint
      const response = await axios.post('/api/ipfs/test-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Wallet-Address': '0xTestWallet123'
        }
      });
      
      console.log('IPFS upload test result:', response.data);
      
      setUploadResult({
        type: 'upload',
        data: response.data
      });
    } catch (err) {
      console.error('IPFS upload test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown upload error');
      
      if (axios.isAxiosError(err) && err.response) {
        setError(`${err.message} - ${JSON.stringify(err.response.data)}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>IPFS Upload Test</CardTitle>
        <CardDescription>
          Test Pinata IPFS upload functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select File</Label>
          <Input 
            id="file" 
            type="file" 
            onChange={handleFileChange} 
            ref={fileInputRef}
          />
          {file && (
            <div className="text-sm">
              Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {uploadResult && (
          <Alert>
            <AlertTitle>
              {uploadResult.type === 'connection' ? 'Connection Test Result' : 'Upload Result'}
            </AlertTitle>
            <AlertDescription className="overflow-auto max-h-40">
              <pre className="text-xs">
                {JSON.stringify(uploadResult.data, null, 2)}
              </pre>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={clearFile}>
          Clear
        </Button>
        <div className="space-x-2">
          <Button variant="secondary" onClick={testPinataConnection} disabled={isUploading}>
            {isUploading ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button onClick={testUpload} disabled={isUploading || !file}>
            {isUploading ? 'Uploading...' : 'Test Upload'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}