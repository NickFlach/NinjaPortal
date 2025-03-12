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
    } catch (err: unknown) {
      console.error('Pinata connection test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error testing connection');
      
      // Enhanced error reporting for Axios errors
      if (axios.isAxiosError(err) && err.response) {
        setError(`Connection failed (${err.response.status}): ${JSON.stringify(err.response.data)}`);
      }
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
      
      // Get file size in MB for logging
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`Uploading file: ${file.name}, Size: ${fileSizeMB} MB, Type: ${file.type}`);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Make request to test endpoint with advanced error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await axios.post('/api/ipfs/test-upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'X-Wallet-Address': '0xTestWallet123'
          },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        });
        
        clearTimeout(timeoutId);
        console.log('IPFS upload test result:', response.data);
        
        setUploadResult({
          type: 'upload',
          data: response.data
        });
      } catch (uploadError) {
        clearTimeout(timeoutId);
        throw uploadError;
      }
    } catch (err: unknown) {
      console.error('IPFS upload test error:', err);
      
      const error = err as any; // Type assertion for error handling
      
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError('Upload timed out. The file might be too large or the server is busy.');
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with an error
          setError(`Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          // Request made but no response received
          setError('No response from server. Please check your network connection.');
        } else {
          // Error in setting up the request
          setError(`Request error: ${error.message}`);
        }
      } else {
        setError(error instanceof Error ? error.message : 'Unknown upload error');
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