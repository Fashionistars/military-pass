# Military Pass - API Documentation

## Overview

Military Pass provides a comprehensive REST API and WebSocket interface for real-time face and voice transformation. This document describes all available endpoints, request/response formats, authentication methods, and usage examples.

---

## Base URLs

### Production
- **REST API**: `https://api.militarypass.com/v1`
- **WebSocket**: `wss://api.militarypass.com/v1/ws`
- **Documentation**: `https://api.militarypass.com/docs`

### Staging
- **REST API**: `https://staging-api.militarypass.com/v1`
- **WebSocket**: `wss://staging-api.militarypass.com/v1/ws`

### Development
- **REST API**: `http://localhost:8000/v1`
- **WebSocket**: `ws://localhost:8000/v1/ws`

---

## Authentication

### API Key Authentication
For developer API access, use API key authentication.

```http
GET /v1/user/profile
Authorization: Bearer YOUR_API_KEY
```

### JWT Authentication
For user authentication, use JWT tokens obtained from login.

```http
GET /v1/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

### OAuth 2.0
For third-party integrations, use OAuth 2.0 flow.

```http
POST /v1/oauth/token
grant_type=authorization_code&code=CODE&redirect_uri=URI
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2026-06-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error details
    }
  },
  "meta": {
    "timestamp": "2026-06-25T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes
- `AUTH_REQUIRED`: Authentication required
- `INVALID_CREDENTIALS`: Invalid username or password
- `INSUFFICIENT_CREDITS`: Not enough credits
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_REQUEST`: Invalid request parameters
- `RESOURCE_NOT_FOUND`: Resource does not exist
- `SERVER_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable

---

## REST API Endpoints

### Authentication

#### Register User
```http
POST /v1/auth/register
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "creator_name",
  "dateOfBirth": "1990-01-01"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "email": "user@example.com",
    "username": "creator_name",
    "credits": 300,
    "token": "jwt_token_here"
  }
}
```

#### Login
```http
POST /v1/auth/login
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

#### Social Login
```http
POST /v1/auth/social
```

**Request Body**:
```json
{
  "provider": "google",
  "accessToken": "social_access_token"
}
```

#### Logout
```http
POST /v1/auth/logout
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Refresh Token
```http
POST /v1/auth/refresh
```

**Request Body**:
```json
{
  "refreshToken": "refresh_token_here"
}
```

---

### User Management

#### Get User Profile
```http
GET /v1/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user_abc123",
    "email": "user@example.com",
    "username": "creator_name",
    "avatar": "https://...",
    "credits": 1500,
    "subscription": "pro",
    "createdAt": "2026-01-15T10:30:00Z"
  }
}
```

#### Update User Profile
```http
PUT /v1/user/profile
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "username": "new_username",
  "avatar": "https://..."
}
```

#### Delete User Account
```http
DELETE /v1/user/account
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### Face Management

#### Upload Face Image
```http
POST /v1/face/upload
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body**:
```
image: [file]
name: "My Avatar"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "faceId": "face_abc123",
    "imageUrl": "https://s3.../face_abc123.jpg",
    "embeddings": "embedding_vector",
    "quality": 0.95,
    "detected": true
  }
}
```

#### Get Face Details
```http
GET /v1/face/:faceId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "faceId": "face_abc123",
    "name": "My Avatar",
    "imageUrl": "https://...",
    "createdAt": "2026-06-25T10:30:00Z",
    "settings": {
      "intensity": 80,
      "enableEnhancement": true
    }
  }
}
```

#### List User Faces
```http
GET /v1/face
Authorization: Bearer YOUR_JWT_TOKEN
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
```

**Response**:
```json
{
  "success": true,
  "data": {
    "faces": [
      {
        "faceId": "face_abc123",
        "name": "My Avatar",
        "imageUrl": "https://..."
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  }
}
```

#### Update Face Settings
```http
PUT /v1/face/:faceId/settings
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "intensity": 90,
  "enableEnhancement": true,
  "faceMappingMode": "multi",
  "mouthMask": false
}
```

#### Delete Face
```http
DELETE /v1/face/:faceId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Preset Avatars
```http
GET /v1/face/presets
```

**Response**:
```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "presetId": "preset_001",
        "name": "Cyber Punk",
        "imageUrl": "https://...",
        "category": "futuristic"
      }
    ]
  }
}
```

---

### Voice Management

#### Upload Voice Sample
```http
POST /v1/voice/upload
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
```

**Request Body**:
```
audio: [file]
name: "My Voice Profile"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "voiceId": "voice_abc123",
    "audioUrl": "https://s3.../voice_abc123.wav",
    "embedding": "voice_embedding_vector",
    "quality": 0.92,
    "characteristics": {
      "pitch": "medium",
      "timbre": "warm",
      "speed": "normal"
    }
  }
}
```

#### Get Voice Details
```http
GET /v1/voice/:voiceId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "voiceId": "voice_abc123",
    "name": "My Voice Profile",
    "audioUrl": "https://...",
    "createdAt": "2026-06-25T10:30:00Z",
    "settings": {
      "pitchShift": 2,
      "speedFactor": 1.0,
      "timbreChange": 50
    }
  }
}
```

#### List User Voices
```http
GET /v1/voice
Authorization: Bearer YOUR_JWT_TOKEN
Query Parameters:
  - page: number (default: 1)
  - limit: number (default: 20)
```

#### Update Voice Settings
```http
PUT /v1/voice/:voiceId/settings
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "pitchShift": 3,
  "speedFactor": 1.1,
  "timbreChange": 60,
  "noiseReduction": true
}
```

#### Delete Voice
```http
DELETE /v1/voice/:voiceId
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Get Preset Voices
```http
GET /v1/voice/presets
```

**Response**:
```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "presetId": "voice_001",
        "name": "Deep Voice",
        "category": "male",
        "previewUrl": "https://..."
      }
    ]
  }
}
```

#### Test Voice Transformation
```http
POST /v1/voice/:voiceId/test
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "testText": "Hello, this is a test",
  "settings": {
    "pitchShift": 2
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transformedAudioUrl": "https://...",
    "processingTime": 120
  }
}
```

---

### Session Management

#### Create Transformation Session
```http
POST /v1/session/create
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "faceId": "face_abc123",
  "voiceId": "voice_abc123",
  "settings": {
    "face": {
      "intensity": 80,
      "enableEnhancement": true,
      "quality": "hd"
    },
    "voice": {
      "pitchShift": 2,
      "speedFactor": 1.0,
      "noiseReduction": true
    },
    "output": {
      "resolution": "1080p",
      "frameRate": 30,
      "bitrate": 6000
    }
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "websocketUrl": "wss://api.militarypass.com/v1/ws/session_xyz789",
    "estimatedLatency": 85,
    "gpuRegion": "us-east-1",
    "creditsPerMinute": 1.5
  }
}
```

#### Get Session Details
```http
GET /v1/session/:sessionId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "status": "active",
    "startTime": "2026-06-25T10:30:00Z",
    "duration": 300,
    "creditsUsed": 7.5,
    "settings": {
      // Session settings
    },
    "metrics": {
      "avgLatency": 82,
      "currentFPS": 30,
      "gpuUtilization": 75
    }
  }
}
```

#### List User Sessions
```http
GET /v1/session
Authorization: Bearer YOUR_JWT_TOKEN
Query Parameters:
  - status: string (active, completed, failed)
  - page: number
  - limit: number
```

#### Update Session Settings
```http
PUT /v1/session/:sessionId/settings
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "face": {
    "intensity": 90
  },
  "voice": {
    "pitchShift": 3
  }
}
```

#### Terminate Session
```http
POST /v1/session/:sessionId/terminate
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session_xyz789",
    "finalDuration": 600,
    "totalCreditsUsed": 15,
    "summary": {
      "avgLatency": 82,
      "totalFrames": 18000,
      "totalAudioChunks": 12000
    }
  }
}
```

---

### Credit Management

#### Get Credit Balance
```http
GET /v1/credits/balance
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": 1500,
    "currency": "NGN",
    "subscription": {
      "plan": "pro",
      "monthlyCredits": 2000,
      "nextBillingDate": "2026-07-25"
    }
  }
}
```

#### Get Credit Usage History
```http
GET /v1/credits/history
Authorization: Bearer YOUR_JWT_TOKEN
Query Parameters:
  - startDate: string (ISO 8601)
  - endDate: string (ISO 8601)
  - page: number
  - limit: number
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "transactionId": "txn_001",
        "type": "usage",
        "amount": -1.5,
        "description": "Session usage",
        "timestamp": "2026-06-25T10:30:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

#### Purchase Credits
```http
POST /v1/credits/purchase
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "packageId": "package_1000",
  "paymentMethod": "stripe",
  "amount": 50999,
  "currency": "NGN"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_xyz789",
    "creditsAdded": 1000,
    "newBalance": 2500,
    "paymentUrl": "https://stripe.com/..."
  }
}
```

#### Get Credit Packages
```http
GET /v1/credits/packages
```

**Response**:
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "packageId": "package_300",
        "name": "Starter",
        "credits": 300,
        "price": 16000,
        "currency": "NGN"
      }
    ]
  }
}
```

---

### Subscription Management

#### Get Subscription Status
```http
GET /v1/subscription/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "active": true,
    "plan": "pro",
    "monthlyCredits": 2000,
    "nextBillingDate": "2026-07-25",
    "amount": 100000,
    "currency": "NGN"
  }
}
```

#### Subscribe to Plan
```http
POST /v1/subscription/subscribe
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "planId": "plan_pro",
  "paymentMethod": "stripe"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_abc123",
    "plan": "pro",
    "status": "active",
    "nextBillingDate": "2026-07-25"
  }
}
```

#### Cancel Subscription
```http
POST /v1/subscription/cancel
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Subscription
```http
PUT /v1/subscription/update
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "planId": "plan_ultimate"
}
```

---

### Integration Management

#### Configure OBS Integration
```http
POST /v1/integrations/obs
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "virtualCamera": true,
  "resolution": "1080p",
  "frameRate": 60,
  "bitrate": 8000
}
```

#### Configure Streaming Platform
```http
POST /v1/integrations/streaming
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "platform": "twitch",
  "streamKey": "your_stream_key",
  "resolution": "1080p",
  "bitrate": 6000,
  "frameRate": 30
}
```

#### Get Integrations Status
```http
GET /v1/integrations/status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response**:
```json
{
  "success": true,
  "data": {
    "obs": {
      "configured": true,
      "virtualCamera": true
    },
    "twitch": {
      "configured": true,
      "status": "ready"
    }
  }
}
```

---

### Analytics

#### Get User Analytics
```http
GET /v1/analytics/user
Authorization: Bearer YOUR_JWT_TOKEN
Query Parameters:
  - startDate: string
  - endDate: string
  - metrics: string[]
```

**Response**:
```json
{
  "success": true,
  "data": {
    "totalSessions": 50,
    "totalDuration": 15000,
    "totalCreditsUsed": 225,
    "avgLatency": 85,
    "popularFeatures": ["face_swap", "voice_change"]
  }
}
```

#### Get System Analytics (Admin)
```http
GET /v1/analytics/system
Authorization: Bearer ADMIN_API_KEY
```

---

## WebSocket API

### Connection
```javascript
const socket = io('wss://api.militarypass.com/v1/ws', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

### Events

#### Client → Server

**Join Session**
```json
{
  "event": "join_session",
  "data": {
    "sessionId": "session_xyz789"
  }
}
```

**Send Video Frame**
```json
{
  "event": "video_frame",
  "data": {
    "frameData": "base64_encoded_frame",
    "timestamp": 1678901234567
  }
}
```

**Send Audio Chunk**
```json
{
  "event": "audio_chunk",
  "data": {
    "audioData": "base64_encoded_audio",
    "timestamp": 1678901234567
  }
}
```

**Update Settings**
```json
{
  "event": "update_settings",
  "data": {
    "face": {
      "intensity": 90
    }
  }
}
```

**Start Streaming**
```json
{
  "event": "start_streaming",
  "data": {
    "platform": "twitch",
    "streamKey": "stream_key"
  }
}
```

**Stop Streaming**
```json
{
  "event": "stop_streaming"
}
```

**Heartbeat**
```json
{
  "event": "heartbeat",
  "data": {
    "timestamp": 1678901234567
  }
}
```

#### Server → Client

**Session Joined**
```json
{
  "event": "session_joined",
  "data": {
    "sessionId": "session_xyz789",
    "status": "ready",
    "estimatedLatency": 85
  }
}
```

**Transformed Frame**
```json
{
  "event": "transformed_frame",
  "data": {
    "frameData": "base64_encoded_transformed",
    "processingTime": 68,
    "timestamp": 1678901234635
  }
}
```

**Transformed Audio**
```json
{
  "event": "transformed_audio",
  "data": {
    "audioData": "base64_encoded_transformed",
    "processingTime": 102,
    "timestamp": 1678901234669
  }
}
```

**Session Metrics**
```json
{
  "event": "session_metrics",
  "data": {
    "avgLatency": 82,
    "currentFPS": 30,
    "gpuUtilization": 75,
    "creditsUsed": 1.5
  }
}
```

**Error**
```json
{
  "event": "error",
  "data": {
    "code": "GPU_UNAVAILABLE",
    "message": "No GPU resources available",
    "retryAfter": 30
  }
}
```

**Session Ended**
```json
{
  "event": "session_ended",
  "data": {
    "sessionId": "session_xyz789",
    "finalDuration": 600,
    "totalCreditsUsed": 15
  }
}
```

**Streaming Started**
```json
{
  "event": "streaming_started",
  "data": {
    "platform": "twitch",
    "streamUrl": "https://twitch.tv/..."
  }
}
```

**Streaming Stopped**
```json
{
  "event": "streaming_stopped",
  "data": {
    "duration": 3600,
    "viewers": 150
  }
}
```

---

## Rate Limiting

### Rate Limits by Endpoint

| Endpoint | Rate Limit | Burst |
|----------|------------|-------|
| Authentication | 10 req/min | 20 |
| Profile | 60 req/min | 100 |
| Face Upload | 10 req/min | 20 |
| Voice Upload | 10 req/min | 20 |
| Session Create | 5 req/min | 10 |
| Session Update | 60 req/min | 100 |
| Credits | 30 req/min | 50 |

### Rate Limit Headers
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1678902000
```

---

## Webhooks

### Configure Webhook
```http
POST /v1/webhooks
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body**:
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["session.completed", "credit.low"],
  "secret": "webhook_secret"
}
```

### Webhook Events

**Session Completed**
```json
{
  "event": "session.completed",
  "data": {
    "sessionId": "session_xyz789",
    "userId": "user_abc123",
    "duration": 600,
    "creditsUsed": 15,
    "timestamp": "2026-06-25T10:30:00Z"
  }
}
```

**Credit Low**
```json
{
  "event": "credit.low",
  "data": {
    "userId": "user_abc123",
    "balance": 50,
    "threshold": 100,
    "timestamp": "2026-06-25T10:30:00Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { MilitaryPassClient } from '@militarypass/sdk';

const client = new MilitaryPassClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.militarypass.com/v1'
});

// Upload face
const face = await client.faces.upload({
  image: './my-face.jpg',
  name: 'My Avatar'
});

// Create session
const session = await client.sessions.create({
  faceId: face.id,
  voiceId: voice.id
});

// Connect WebSocket
const ws = await client.sessions.connect(session.id);
ws.on('transformed_frame', (frame) => {
  console.log('Received transformed frame');
});
```

### Python
```python
from militarypass import MilitaryPassClient

client = MilitaryPassClient(
    api_key='your-api-key',
    base_url='https://api.militarypass.com/v1'
)

# Upload face
face = client.faces.upload(
    image='./my-face.jpg',
    name='My Avatar'
)

# Create session
session = client.sessions.create(
    face_id=face.id,
    voice_id=voice.id
)

# Connect WebSocket
ws = client.sessions.connect(session.id)
ws.on('transformed_frame', lambda frame: print('Frame received'))
```

---

## Error Handling

### Retry Strategy
- **429 Rate Limit**: Exponential backoff, max 3 retries
- **500 Server Error**: Exponential backoff, max 5 retries
- **503 Service Unavailable**: Exponential backoff, max 10 retries

### Best Practices
- Always handle rate limit headers
- Implement retry logic with exponential backoff
- Validate input before sending requests
- Use WebSockets for real-time operations
- Monitor credit balance before creating sessions

---

## API Versioning

### Version Strategy
- URL versioning: `/v1/`, `/v2/`
- Backward compatibility maintained for 12 months
- Deprecation warnings sent 6 months before removal

### Current Version
- **Latest**: v1
- **Stable**: v1
- **Deprecated**: None

---

## Testing

### Sandbox Environment
For testing, use the sandbox environment:
- **URL**: `https://sandbox-api.militarypass.com/v1`
- **Features**: Full API functionality
- **Limitations**: No actual GPU processing
- **Credits**: Unlimited test credits

### Test API Keys
Generate test API keys in the developer dashboard.

---

*This API documentation will be updated as new features are added.*