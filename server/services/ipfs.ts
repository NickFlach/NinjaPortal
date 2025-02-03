import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const TREASURY_ADDRESS = 'REDACTED_WALLET_ADDRESS';
const PINATA_JWT = process.env.VITE_PINATA_JWT;

interface IPFSCredentials {
  jwt: string;
  account: string;
}

// Encrypt sensitive IPFS credentials before storing
function encryptCredentials(credentials: IPFSCredentials): string {
  const key = process.env.REPL_ID || 'default-encryption-key';
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Decrypt stored IPFS credentials
function decryptCredentials(encrypted: string): IPFSCredentials {
  const key = process.env.REPL_ID || 'default-encryption-key';
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

export async function getIPFSCredentials(address: string): Promise<string> {
  // Treasury address always uses the main PINATA_JWT
  if (address.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
    return PINATA_JWT || '';
  }

  const [user] = await db.select()
    .from(users)
    .where(eq(users.address, address.toLowerCase()))
    .limit(1);

  if (!user?.ipfsSecret) {
    throw new Error('IPFS credentials not found for user');
  }

  const credentials = decryptCredentials(user.ipfsSecret);
  return credentials.jwt;
}

export async function createIPFSAccount(address: string): Promise<void> {
  try {
    // In a real implementation, we would:
    // 1. Call Pinata API to create a new API key
    // 2. Store the credentials securely
    // For now, we'll use a placeholder implementation
    
    const credentials: IPFSCredentials = {
      jwt: PINATA_JWT || '', // For demo, using the same JWT
      account: `ipfs-${address.toLowerCase()}`,
    };

    await db.update(users)
      .set({
        ipfsAccount: credentials.account,
        ipfsSecret: encryptCredentials(credentials),
      })
      .where(eq(users.address, address.toLowerCase()));

  } catch (error) {
    console.error('Error creating IPFS account:', error);
    throw new Error('Failed to create IPFS account');
  }
}

export function getTreasuryAddress(): string {
  return TREASURY_ADDRESS;
}
