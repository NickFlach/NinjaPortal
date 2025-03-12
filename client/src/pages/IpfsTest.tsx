import { Layout } from '../components/Layout';
import { IpfsUploadTest } from '../components/IpfsUploadTest';

export default function IpfsTestPage() {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">IPFS Integration Test</h1>
        <p className="mb-8 text-muted-foreground">
          This page allows testing of the Pinata IPFS integration for uploads and downloads.
        </p>
        
        <div className="grid gap-8">
          <IpfsUploadTest />
        </div>
      </div>
    </Layout>
  );
}