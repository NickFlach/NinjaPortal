import { Layout } from '../components/Layout';
import { IpfsUploadTest } from '../components/IpfsUploadTest';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, UploadCloud } from 'lucide-react';

export default function IpfsTestPage() {
  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <UploadCloud className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">IPFS Diagnostic</h1>
        </div>
        
        <Alert className="mb-6">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle>Decentralized Storage Test</AlertTitle>
          <AlertDescription>
            This diagnostic page allows you to test the connection to Pinata IPFS service and verify file uploads.
            Use this tool to troubleshoot decentralized storage issues in the music platform.
          </AlertDescription>
        </Alert>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-3">What is IPFS?</h2>
            <p className="text-muted-foreground mb-4">
              InterPlanetary File System (IPFS) is a decentralized storage protocol that enables permanent and 
              distributed storage of files. In our music platform, IPFS ensures your audio files remain accessible 
              regardless of server status.
            </p>
            
            <h3 className="text-lg font-medium mb-2">Benefits:</h3>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mb-4">
              <li>Censorship resistance</li>
              <li>Improved reliability</li>
              <li>Content-based addressing</li>
              <li>Reduced bandwidth costs</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-3">Test Instructions</h2>
            <ol className="list-decimal pl-5 text-muted-foreground space-y-2">
              <li>First click <strong>"Test Connection"</strong> to verify your Pinata API credentials are working correctly.</li>
              <li>If the connection test is successful, select a small audio file (MP3, WAV, etc.) using the file selector.</li>
              <li>Click <strong>"Test Upload"</strong> to attempt uploading the file to IPFS via Pinata.</li>
              <li>If successful, you'll receive an IPFS hash (CID) that can be used to access your file from any IPFS gateway.</li>
            </ol>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="grid gap-8">
          <div className="mx-auto w-full max-w-md">
            <IpfsUploadTest />
          </div>
          
          <div className="text-sm text-center text-muted-foreground mt-4">
            <p>All uploads during testing are stored on Pinata IPFS service and are public. Do not upload sensitive content.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}