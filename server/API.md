const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws/music-sync`;
```

**Client Messages:**
```typescript
// Authentication
{ type: 'auth', address: string }

// Subscribe to song updates
{ type: 'subscribe', songId: number }

// Sync playback status
{ type: 'sync', songId: number, timestamp: number, playing: boolean }

// Update location
{ type: 'location_update', coordinates: { lat: number, lng: number }, countryCode: string }
```

**Server Messages:**
```typescript
// Stats update
{ 
  type: 'stats_update',
  data: {
    activeListeners: number,
    geotaggedListeners: number,
    anonymousListeners: number,
    listenersByCountry: Record<string, number>
  }
}

// Playback sync
{ type: 'sync', songId: number, timestamp: number, playing: boolean }
```

## HTTP Endpoints

### Music Map Data

#### GET /api/music/map
Returns geographical data about music listeners, including real-time listener counts.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)
- `x-internal-token`: For landing page access (optional)

**Response:**
```typescript
{
  countries: {
    [countryCode: string]: {
      locations: [number, number][],  // [latitude, longitude] pairs
      listenerCount: number,
      anonCount: number     // non-geotagged plays
    }
  },
  totalListeners: number    // real-time active listener count
}
```

#### POST /api/music/map
Records a new listener location.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)

**Request Body:**
```typescript
{
  songId: number,
  countryCode: string,
  coordinates?: {
    lat: number,
    lng: number
  }
}
```

### Real-time Stats

#### GET /api/music/stats
Returns current platform statistics including active listeners.

**Response:**
```typescript
{
  activeListeners: number,
  geotaggedListeners: number,
  anonymousListeners: number,
  listenersByCountry: Record<string, number>
}
```

### Songs and Playlists
#### GET /api/songs/recent
Returns the most recently played songs.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address

**Response:**
```json
[
  {
    "id": "number",
    "title": "string",
    "artist": "string",
    "ipfsHash": "string",
    "createdAt": "timestamp"
  }
]
```

#### GET /api/songs/library
Returns songs uploaded by the authenticated user.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address

**Response:**
```json
[
  {
    "id": "number",
    "title": "string",
    "artist": "string",
    "ipfsHash": "string",
    "uploadedBy": "string",
    "createdAt": "timestamp"
  }
]
```

### Music Metadata

#### GET /api/music/metadata/:id
Returns metadata for a specific song.

**Parameters:**
- `id`: Song ID (number)

**Response:**
```json
{
  "id": "number",
  "title": "string",
  "artist": "string",
  "ipfsHash": "string",
  "uploadedBy": "string",
  "createdAt": "timestamp"
}
```

### IPFS Integration

#### POST /api/ipfs/test-connection
Tests the connection to Pinata IPFS service.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)

**Response:**
```json
{
  "success": true,
  "message": "Pinata connection successful",
  "credentials": {
    "keyProvided": true,
    "secretProvided": true
  },
  "data": {
    "message": "Congratulations! You are communicating with the Pinata API!"
  }
}
```

#### POST /api/ipfs/test-upload
Test endpoint for uploading a file to IPFS via Pinata.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (optional)
- `Content-Type`: multipart/form-data

**Request Body:**
- `file`: File to upload (form-data)

**Response:**
```json
{
  "success": true,
  "hash": "QmHash...",
  "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmHash...",
  "data": {
    "IpfsHash": "QmHash...",
    "PinSize": 123456,
    "Timestamp": "2025-03-12T02:18:11.693Z",
    "Name": "example.mp3",
    "NumberOfFiles": 1,
    "MimeType": "audio/mpeg",
    "Keyvalues": {
      "app": "neo-music-portal",
      "timestamp": "2025-03-12T02:18:08.947Z",
      "uploadedBy": "0xAddress",
      "contentType": "audio/mpeg"
    }
  }
}
```

#### POST /api/ipfs/upload
Uploads a file to IPFS via Pinata. This is the production endpoint used by the application.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address (required)
- `Content-Type`: multipart/form-data

**Request Body:**
- `file`: File to upload (form-data)
- Additional metadata can be included as form fields

**Response:**
```json
{
  "success": true,
  "Hash": "QmHash...",
  "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmHash..."
}
```

#### GET /api/ipfs/fetch/:cid
Fetches a file from IPFS using its content identifier (CID).

**Parameters:**
- `cid`: IPFS content identifier (string)

**Response:**
Binary file data with appropriate Content-Type header