# API Documentation

## Authentication
All API endpoints require a wallet address to be passed in the `x-wallet-address` header.

## Endpoints

### Users

#### POST /api/users/register
Registers a new user or updates an existing user's last seen timestamp.

**Request Headers:**
- `x-wallet-address`: Ethereum wallet address

**Response:**
```json
{
  "success": true,
  "user": {
    "address": "string",
    "lastSeen": "timestamp"
  },
  "recentSongs": [...]
}
```

### Songs

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

#### GET /api/music/stats
Returns general statistics about the music platform.

**Response:**
```json
{
  "totalSongs": "number",
  "totalPlays": "number",
  "totalUsers": "number"
}
```

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

#### GET /api/music/map
Returns geographical data about music listeners.

**Response:**
```json
{
  "countries": {
    "[country_code]": {
      "votes": "number",
      "locations": [
        [latitude, longitude]
      ]
    }
  },
  "totalListeners": "number"
}
```

### Feed

#### GET /api/feed.rss
Returns an RSS feed of the latest songs.

**Response:**
Content-Type: application/rss+xml