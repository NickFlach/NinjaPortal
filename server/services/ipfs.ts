import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const TREASURY_ADDRESS = 'REDACTED_WALLET_ADDRESS';
const PINATA_JWT = process.env.VITE_PINATA_JWT;
const PINATA_API = 'https://api.pinata.cloud';

interface IPFSCredentials {
  jwt: string;
  account: string;
}

export async function verifyPinataJWT(jwt: string): Promise<boolean> {
  try {
    const response = await fetch(`${PINATA_API}/data/testAuthentication`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to verify Pinata JWT:', error);
    return false;
  }
}

function encryptCredentials(credentials: IPFSCredentials): string {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.REPL_ID || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptCredentials(encrypted: string): IPFSCredentials {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.REPL_ID || 'default-key', 'salt', 32);
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

export async function getIPFSCredentials(address: string): Promise<string> {
  if (!PINATA_JWT) {
    console.error('Pinata JWT not configured');
    throw new Error('Pinata configuration missing');
  }

  // First verify the main JWT is valid
  const isValid = await verifyPinataJWT(PINATA_JWT);
  if (!isValid) {
    console.error('Main Pinata JWT is invalid');
    throw new Error('Invalid Pinata configuration');
  }

  // Treasury address always uses the main PINATA_JWT
  if (address.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
    return PINATA_JWT;
  }

  try {
    const [user] = await db.select()
      .from(users)
      .where(eq(users.address, address.toLowerCase()))
      .limit(1);

    if (!user?.ipfsSecret) {
      console.error('No IPFS credentials found for address:', address);
      throw new Error('IPFS credentials not found for user');
    }

    const credentials = decryptCredentials(user.ipfsSecret);

    // Verify the user's JWT is still valid
    const isUserJwtValid = await verifyPinataJWT(credentials.jwt);
    if (!isUserJwtValid) {
      console.error('User JWT invalid, attempting to recreate IPFS account');
      await createIPFSAccount(address);
      const [updatedUser] = await db.select()
        .from(users)
        .where(eq(users.address, address.toLowerCase()))
        .limit(1);
      if (!updatedUser?.ipfsSecret) {
        throw new Error('Failed to recreate IPFS credentials');
      }
      return decryptCredentials(updatedUser.ipfsSecret).jwt;
    }

    return credentials.jwt;
  } catch (error) {
    console.error('Error getting IPFS credentials:', error);
    throw new Error('Failed to retrieve IPFS credentials');
  }
}

export async function createIPFSAccount(address: string): Promise<void> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  try {
    console.log(`Creating IPFS account for address: ${address}`);

    // Create a submarine key with restricted access for the user
    const response = await fetch(`${PINATA_API}/users/generateApiKey`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        keyName: `music-portal-${address.toLowerCase()}`,
        permissions: {
          endpoints: {
            pinning: {
              pinFileToIPFS: true,
              unpin: true
            },
            data: {
              pinList: true,
              userPinnedDataTotal: true,
              testAuthentication: true
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      console.error('Pinata API key creation failed:', errorData);
      throw new Error(`Failed to create Pinata API key: ${errorData.error || response.statusText}`);
    }

    const { JWT, pinata_api_key } = await response.json();
    console.log(`Successfully created Pinata API key for: ${address}`);

    const credentials: IPFSCredentials = {
      jwt: JWT,
      account: pinata_api_key
    };

    // Store the encrypted credentials
    await db.update(users)
      .set({
        ipfsAccount: credentials.account,
        ipfsSecret: encryptCredentials(credentials),
      })
      .where(eq(users.address, address.toLowerCase()));

    console.log(`Successfully stored IPFS credentials for: ${address}`);
  } catch (error) {
    console.error('Error creating IPFS account:', error);
    throw new Error('Failed to create IPFS account');
  }
}

export function getTreasuryAddress(): string {
  return TREASURY_ADDRESS;
}