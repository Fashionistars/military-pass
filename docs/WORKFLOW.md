# Military Pass - Workflow Documentation

## Platform Workflow Overview

Military Pass is a real-time AI-powered face and voice transformation platform that allows users to transform their identity during live streams, video calls, and content creation. This document outlines the complete workflow from user onboarding to live transformation.

---

## User Journey Workflow

### 1. Account Creation & Onboarding

#### Step 1.1: Registration
```
User visits militarypass.com
→ Clicks "Get Started" button
→ Chooses registration method:
  - Email/Password registration
  - Social login (Google, Facebook, TikTok)
→ Completes profile setup
→ Receives welcome email with credits
```

**Technical Flow**:
1. Frontend captures user registration data
2. Validates input format and strength
3. Sends POST request to `/api/auth/register`
4. Backend creates user record in database
5. Generates JWT token for session
6. Stores session in Redis
7. Returns success response with auth token
8. Frontend stores token and redirects to dashboard

**API Endpoint**:
```typescript
POST /api/auth/register
Request Body:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "creator_name"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "creator_name",
    "credits": 300
  }
}
```

#### Step 1.2: Dashboard Navigation
```
User logs in
→ Redirected to main dashboard
→ Dashboard shows:
  - Credit balance
  - Quick start options
  - Recent transformations
  - Platform integrations status
→ User selects "Start Transformation"
```

**Dashboard Components**:
- Credit Balance Display
- Quick Start Cards (Face Upload, Voice Setup, Live Stream)
- Recent Activity Feed
- Integration Status (OBS, Zoom, TikTok)
- Help & Support Links

---

### 2. Face Transformation Setup

#### Step 2.1: Face Upload or Avatar Selection
```
User navigates to Face Setup
→ Chooses option:
  Option A: Upload own face image
  Option B: Select from preset avatars
  Option C: Use AI-generated avatar
→ Uploads image (max 10MB, JPG/PNG)
→ System processes and validates image
→ Preview shows uploaded face
→ User confirms or re-uploads
```

**Technical Flow**:
1. User selects image file from device
2. Frontend validates file size and format
3. Uploads to `/api/face/upload` endpoint
4. Backend stores image in S3 bucket
5. Runs face detection validation
6. Extracts face embeddings using InsightFace
7. Stores face metadata in database
8. Returns success with face ID

**API Endpoint**:
```typescript
POST /api/face/upload
Request Body: FormData
{
  "image": File (JPG/PNG, max 10MB),
  "name": "My Avatar Name"
}

Response:
{
  "success": true,
  "faceId": "face_12345",
  "imageUrl": "https://s3.../face_12345.jpg",
  "embeddings": "face_embedding_vector",
  "quality": 0.95
}
```

**Validation Requirements**:
- File size: ≤ 10MB
- File format: JPG, PNG, WEBP
- Face detection: Must detect exactly one clear face
- Image quality: Minimum 512x512 resolution
- Face visibility: Front-facing, well-lit

#### Step 2.2: Face Processing & Enhancement
```
System processes uploaded face
→ Runs face detection and alignment
→ Applies face enhancement (GFPGAN)
→ Generates multiple transformation variants
→ Creates face preview thumbnails
→ User selects preferred variant
→ System finalizes face profile
```

**Processing Pipeline**:
1. **Face Detection**: RetinaFace detects face landmarks
2. **Face Alignment**: Aligns face based on 5-point landmarks
3. **Face Enhancement**: GFPGAN enhances resolution and quality
4. **Embedding Generation**: InsightFace generates 512-dim embedding
5. **Variant Creation**: Generates 3-4 style variants
6. **Quality Assessment**: Scores each variant (0.0-1.0)
7. **Storage**: Saves processed images and embeddings

**Processing Time**: 2-5 seconds per face

#### Step 2.3: Face Settings Configuration
```
User configures face transformation settings
→ Adjusts transformation intensity (0-100%)
→ Enables/disables face enhancement
→ Selects face mapping mode (single/multi-face)
→ Configures mouth mask option
→ Sets face swap trigger (automatic/manual)
→ Saves configuration
```

**Settings Options**:
```typescript
interface FaceSettings {
  transformationIntensity: number; // 0-100
  enableEnhancement: boolean;
  faceMappingMode: 'single' | 'multi';
  mouthMask: boolean;
  swapTrigger: 'auto' | 'manual';
  qualityLevel: 'low' | 'medium' | 'high';
  preserveEyeColor: boolean;
  preserveSkinTone: boolean;
}
```

---

### 3. Voice Transformation Setup

#### Step 3.1: Voice Sample Upload
```
User navigates to Voice Setup
→ Records voice sample (30-60 seconds)
→ Or uploads existing audio file
→ System validates audio quality
→ Extracts voice characteristics
→ Generates voice embedding
→ Shows voice quality score
```

**Technical Flow**:
1. User grants microphone access
2. Records 30-60 second voice sample
3. Frontend captures audio via Web Audio API
4. Uploads to `/api/voice/upload` endpoint
5. Backend validates audio quality (sample rate, bit depth)
6. Extracts voice features using RVC or Coqui
7. Generates voice embedding vector
8. Stores audio file and metadata

**API Endpoint**:
```typescript
POST /api/voice/upload
Request Body: FormData
{
  "audio": File (WAV/MP3, 30-60 seconds),
  "name": "My Voice Profile"
}

Response:
{
  "success": true,
  "voiceId": "voice_67890",
  "audioUrl": "https://s3.../voice_67890.wav",
  "embedding": "voice_embedding_vector",
  "quality": 0.92,
  "characteristics": {
    "pitch": "medium",
    "timbre": "warm",
    "speed": "normal"
  }
}
```

**Audio Requirements**:
- Duration: 30-60 seconds
- Format: WAV, MP3, M4A
- Sample rate: 44.1kHz or 48kHz
- Bit depth: 16-bit or 24-bit
- Quality: Clear speech, minimal background noise

#### Step 3.2: Voice Style Selection
```
User selects voice transformation style
→ Chooses from preset voices:
  - Celebrity voices
  - Character voices
  - Gender变换
  - Age modification
→ Or creates custom voice profile
→ Adjusts voice parameters:
  - Pitch shift
  - Speed adjustment
  - Timbre modification
→ Preview voice transformation
→ Saves voice configuration
```

**Preset Voice Categories**:
- **Celebrity**: Famous actor/actress voices
- **Character**: Animated character voices
- **Gender**: Male-to-Female, Female-to-Male
- **Age**: Young, Middle-aged, Senior
- **Style**: Professional, Casual, Dramatic

**Voice Parameters**:
```typescript
interface VoiceSettings {
  presetId?: string;
  pitchShift: number; // -12 to +12 semitones
  speedFactor: number; // 0.5 to 2.0
  timbreChange: number; // 0 to 100
  formantShift: number; // 0 to 100
  noiseReduction: boolean;
  echoRemoval: boolean;
}
```

#### Step 3.3: Voice Processing & Preview
```
System processes voice profile
→ Applies selected voice style
→ Generates transformed sample
→ Plays before/after comparison
→ User adjusts parameters if needed
→ Finalizes voice profile
→ System prepares for real-time processing
```

**Processing Pipeline**:
1. **Voice Analysis**: Extracts pitch, timbre, formants
2. **Style Transfer**: Applies RVC or similar model
3. **Quality Enhancement**: Removes noise, normalizes audio
4. **Real-time Optimization**: Converts to ONNX for low latency
5. **Preview Generation**: Creates 10-second sample
6. **Storage**: Saves processed voice model

**Processing Time**: 5-15 seconds per voice profile

---

### 4. Real-Time Transformation Session

#### Step 4.1: Session Initialization
```
User starts transformation session
→ System creates session record
→ Allocates GPU resources
→ Initializes WebSocket connection
→ Loads face and voice models
→ Establishes video/audio streams
→ Shows "Ready" status
```

**Session Setup Flow**:
1. User clicks "Start Transformation"
2. Frontend requests session via `/api/session/create`
3. Backend creates session record in database
4. Allocates GPU instance from pool
5. Loads selected face and voice models
6. Establishes WebSocket connection
7. Initializes video/audio capture
8. Returns session ID and WebSocket URL

**API Endpoint**:
```typescript
POST /api/session/create
Request Body:
{
  "faceId": "face_12345",
  "voiceId": "voice_67890",
  "settings": {
    "face": FaceSettings,
    "voice": VoiceSettings
  }
}

Response:
{
  "success": true,
  "sessionId": "session_abc123",
  "websocketUrl": "wss://api.militarypass.com/session/abc123",
  "estimatedLatency": 85,
  "gpuRegion": "us-east-1"
}
```

#### Step 4.2: Video Stream Processing
```
User enables camera
→ System captures webcam feed
→ Sends frames to processing server
→ Each frame undergoes:
  1. Face detection
  2. Face alignment
  3. Face swap application
  4. Face enhancement
  5. Quality check
→ Returns transformed frame
→ Displays in live output window
```

**Frame Processing Pipeline**:
```
Input Frame (Webcam)
↓
Face Detection (RetinaFace) - 10ms
↓
Face Alignment (5-point landmarks) - 5ms
↓
Face Swap (InsightFace) - 30ms
↓
Face Enhancement (GFPGAN) - 20ms
↓
Quality Check - 5ms
↓
Output Frame (Transformed) - Total: ~70ms
```

**WebSocket Message Format**:
```typescript
// Client to Server
{
  "type": "frame",
  "sessionId": "session_abc123",
  "frameData": "base64_encoded_frame",
  "timestamp": 1678901234567
}

// Server to Client
{
  "type": "transformed_frame",
  "sessionId": "session_abc123",
  "frameData": "base64_encoded_transformed",
  "processingTime": 68,
  "timestamp": 1678901234635
}
```

#### Step 4.3: Audio Stream Processing
```
User enables microphone
→ System captures audio stream
→ Chunks audio into 50ms segments
→ Each chunk undergoes:
  1. Voice activity detection
  2. Noise reduction
  3. Voice transformation
  4. Quality enhancement
→ Returns transformed audio
→ Plays through speakers
```

**Audio Processing Pipeline**:
```
Input Audio (Microphone)
↓
Voice Activity Detection - 5ms
↓
Noise Reduction (RNNoise) - 10ms
↓
Voice Transformation (RVC) - 80ms
↓
Quality Enhancement - 10ms
↓
Output Audio (Transformed) - Total: ~105ms
```

**Audio Chunk Processing**:
```typescript
// Client to Server
{
  "type": "audio_chunk",
  "sessionId": "session_abc123",
  "audioData": "base64_encoded_audio",
  "timestamp": 1678901234567
}

// Server to Client
{
  "type": "transformed_audio",
  "sessionId": "session_abc123",
  "audioData": "base64_encoded_transformed",
  "processingTime": 102,
  "timestamp": 1678901234669
}
```

#### Step 4.4: Synchronization & Output
```
System synchronizes audio and video
→ Applies lip-sync correction
→ Adjusts for processing delays
→ Outputs synchronized stream
→ User can:
  - Preview locally
  - Send to virtual camera
  - Stream to platforms
```

**Synchronization Algorithm**:
1. Track audio and video timestamps
2. Calculate processing delay differential
3. Apply buffer to slower stream
4. Lip-sync adjustment based on mouth movement
5. Output synchronized streams

**Output Options**:
- **Local Preview**: Display in browser
- **Virtual Camera**: Send to OBS, Zoom, etc.
- **Direct Stream**: RTMP to streaming platforms

---

### 5. Platform Integration

#### Step 5.1: OBS Studio Integration
```
User configures OBS integration
→ Installs Military Pass virtual camera
→ Adds virtual camera as source in OBS
→ Configures OBS settings:
  - Resolution: 1920x1080
  - Frame rate: 30/60 FPS
  - Bitrate: 4000-8000 kbps
→ Starts streaming
```

**Integration Steps**:
1. Download and install virtual camera driver
2. Restart OBS Studio
3. Add "Video Capture Device" source
4. Select "Military Pass Virtual Camera"
5. Configure output settings
6. Start streaming to platform

**Virtual Camera Drivers**:
- **Windows**: DirectShow filter
- **macOS**: AVFoundation plugin
- **Linux**: V4L2 loopback device

#### Step 5.2: Video Conferencing Integration
```
User integrates with meeting platforms
→ Opens Zoom/Google Meet/Teams
→ Selects Military Pass virtual camera
→ Selects Military Pass virtual microphone
→ Tests audio and video
→ Joins meeting with transformed identity
```

**Supported Platforms**:
- Zoom
- Google Meet
- Microsoft Teams
- Skype
- Discord
- WebEx

**Configuration**:
- Camera: Military Pass Virtual Camera
- Microphone: Military Pass Virtual Microphone
- Resolution: 720p or 1080p
- Frame rate: 30 FPS

#### Step 5.3: Social Media Streaming
```
User streams to social platforms
→ Configures streaming credentials
→ Selects platform (TikTok, YouTube, Twitch)
→ Sets stream quality and bitrate
→ Starts transformation session
→ Initiates stream to platform
```

**Streaming Configuration**:
```typescript
interface StreamConfig {
  platform: 'tiktok' | 'youtube' | 'twitch' | 'facebook';
  streamKey: string;
  serverUrl: string;
  resolution: '720p' | '1080p' | '4k';
  bitrate: number; // kbps
  frameRate: 30 | 60;
}
```

**RTMP Endpoint**:
- TikTok Live: `rtmp://tiktok.com/live/`
- YouTube: `rtmp://a.rtmp.youtube.com/live2/`
- Twitch: `rtmp://live.twitch.tv/app/`
- Facebook: `rtmps://live-api-s.facebook.com:443/rtmp/`

---

### 6. Credit System & Billing

#### Step 6.1: Credit Consumption
```
User uses transformation features
→ System tracks credit usage in real-time
→ Consumption rates:
  - Face transformation: 1 credit/minute
  - Voice transformation: 1 credit/minute
  - Combined: 1.5 credits/minute
  - HD processing: 2x multiplier
→ Updates credit balance
→ Notifies user of low credits
```

**Credit Calculation**:
```typescript
function calculateCredits(settings: TransformationSettings): number {
  let baseRate = 1.0; // credits per minute
  
  if (settings.face.enabled && settings.voice.enabled) {
    baseRate = 1.5;
  }
  
  if (settings.quality === 'hd') {
    baseRate *= 2.0;
  }
  
  if (settings.resolution === '4k') {
    baseRate *= 1.5;
  }
  
  return baseRate;
}
```

**Usage Tracking**:
- Real-time WebSocket usage updates
- Database transaction logs
- Credit balance updates every 10 seconds
- Low credit warnings at 20%, 10%, 5%

#### Step 6.2: Credit Purchase
```
User purchases additional credits
→ Navigates to credit purchase page
→ Selects credit package:
  - 300 credits - ₦16,000
  - 1000 credits - ₦50,999
  - 2000 credits - ₦100,000
  - 5000 credits - ₦259,999
  - 12000 credits - ₦599,999
→ Selects payment method
→ Completes payment
→ Credits added to account
```

**Payment Flow**:
1. User selects credit package
2. Redirects to payment gateway (Stripe)
3. Completes payment
4. Webhook notifies backend of successful payment
5. Backend credits user account
6. Sends confirmation email
7. Updates dashboard balance

**API Endpoint**:
```typescript
POST /api/credits/purchase
Request Body:
{
  "packageId": "package_1000",
  "paymentMethod": "stripe",
  "amount": 50999
}

Response:
{
  "success": true,
  "transactionId": "txn_xyz789",
  "creditsAdded": 1000,
  "newBalance": 1500
}
```

#### Step 6.3: Subscription Management
```
User subscribes to monthly plan
→ Selects subscription tier:
  - Starter: ₦16,000/month (300 credits)
  - Basic: ₦50,999/month (1000 credits)
  - Pro: ₦100,000/month (2000 credits)
  - Ultimate: ₦259,999/month (5000 credits)
  - Creator: ₦599,999/month (12000 credits)
→ Sets up recurring payment
→ Credits auto-added monthly
→ Can cancel anytime
```

**Subscription Features**:
- Monthly credit allocation
- Credits rollover (up to 3 months)
- Priority GPU access
- Premium support
- Early access to new features

---

### 7. Session Management & Monitoring

#### Step 7.1: Session Monitoring
```
System monitors active sessions
→ Tracks metrics:
  - Processing latency
  - Frame rate
  - Audio quality
  - GPU utilization
  - Credit consumption
→ Displays real-time metrics to user
→ Alerts on performance issues
```

**Monitoring Dashboard**:
```typescript
interface SessionMetrics {
  sessionId: string;
  startTime: number;
  duration: number;
  avgLatency: number;
  currentFPS: number;
  audioQuality: number;
  gpuUtilization: number;
  creditsUsed: number;
  errors: number;
}
```

**Performance Alerts**:
- Latency > 150ms: Warning
- Latency > 300ms: Critical
- FPS < 24: Warning
- FPS < 15: Critical
- GPU > 90%: Scale warning

#### Step 7.2: Session Termination
```
User ends transformation session
→ Clicks "Stop Transformation"
→ System gracefully shuts down:
  - Stops video/audio capture
  - Closes WebSocket connection
  - Releases GPU resources
  - Calculates final credit usage
  - Saves session record
→ Shows session summary
```

**Session Summary**:
```typescript
interface SessionSummary {
  sessionId: string;
  duration: number;
  totalCreditsUsed: number;
  avgLatency: number;
  totalFramesProcessed: number;
  totalAudioChunks: number;
  peakGPUUsage: number;
  errors: string[];
}
```

**Cleanup Process**:
1. Stop all media streams
2. Close WebSocket connection
3. Release GPU instance to pool
4. Clear temporary files
5. Update database session record
6. Send session summary to user

---

### 8. Content Management

#### Step 8.1: Avatar Management
```
User manages saved avatars
→ Views avatar gallery
→ Can:
  - Create new avatar
  - Edit existing avatar
  - Delete avatar
  - Set as default
  - Share avatar (if public)
→ Changes reflect in real-time
```

**Avatar Operations**:
```typescript
// Create Avatar
POST /api/avatars/create
{ "name": "My Avatar", "image": File }

// Update Avatar
PUT /api/avatars/:id
{ "name": "Updated Name", "settings": FaceSettings }

// Delete Avatar
DELETE /api/avatars/:id

// Set Default
POST /api/avatars/:id/set-default
```

#### Step 8.2: Voice Profile Management
```
User manages voice profiles
→ Views voice profile library
→ Can:
  - Create new profile
  - Edit voice parameters
  - Delete profile
  - Set as default
  - Test voice preview
→ Changes apply immediately
```

**Voice Profile Operations**:
```typescript
// Create Voice Profile
POST /api/voices/create
{ "name": "My Voice", "audio": File, "settings": VoiceSettings }

// Update Voice Profile
PUT /api/voices/:id
{ "name": "Updated Name", "settings": VoiceSettings }

// Delete Voice Profile
DELETE /api/voices/:id

// Test Voice
POST /api/voices/:id/test
{ "testText": "Hello, this is a test" }
```

---

## Error Handling & Recovery

### Common Error Scenarios

#### 1. Face Detection Failure
```
Error: No face detected in uploaded image
→ System shows error message
→ Provides guidance:
  - Ensure image has clear, visible face
  - Use front-facing photo
  - Ensure good lighting
→ Allows re-upload
```

#### 2. Voice Quality Issues
```
Error: Audio quality too low
→ System shows quality score
→ Provides improvement tips:
  - Record in quiet environment
  - Speak clearly and consistently
  - Use quality microphone
→ Allows re-recording
```

#### 3. High Latency
```
Warning: Processing latency above threshold
→ System shows current latency
→ Suggests optimizations:
  - Reduce quality settings
  - Close other applications
  - Check internet connection
→ Auto-adjusts if critical
```

#### 4. GPU Resource Unavailable
```
Error: No GPU resources available
→ System adds to queue
→ Shows estimated wait time
→ Offers options:
  - Wait for resources
  - Try lower quality
  - Schedule for later
→ Notifies when resources available
```

#### 5. Credit Insufficient
```
Error: Insufficient credits for session
→ System shows current balance
→ Required credits for session
→ Offers options:
  - Purchase more credits
  - Subscribe to plan
  - Reduce session quality
→ Allows quick purchase
```

---

## Performance Optimization

### Client-Side Optimizations
- Web Workers for frame processing
- RequestAnimationFrame for smooth rendering
- WebGL for hardware-accelerated graphics
- Audio Worklet for low-latency audio processing
- Connection pooling for WebSocket

### Server-Side Optimizations
- Model quantization (FP16/INT8)
- TensorRT optimization for inference
- Batch processing for multiple frames
- GPU memory pooling
- Connection multiplexing

### Network Optimizations
- WebSocket compression
- Binary data transmission
- Adaptive bitrate based on network conditions
- Edge computing for regional processing
- CDN for static assets

---

## Security Workflow

### Data Encryption
- All data encrypted in transit (TLS 1.3)
- Sensitive data encrypted at rest (AES-256)
- Face embeddings stored in encrypted format
- Voice profiles encrypted with user-specific keys

### Privacy Protection
- Automatic face masking options
- No storage of raw video/audio
- Temporary processing only
- User-controlled data retention
- Right to deletion (GDPR)

### Access Control
- JWT-based authentication
- Role-based permissions
- Rate limiting per user
- IP-based access restrictions
- Device fingerprinting

---

## Analytics & Reporting

### User Analytics
- Session duration tracking
- Feature usage metrics
- Conversion funnel analysis
- User retention analysis
- A/B testing results

### System Analytics
- GPU utilization trends
- Processing latency metrics
- Error rate monitoring
- Credit consumption patterns
- Performance benchmarks

### Business Analytics
- Revenue tracking
- Churn analysis
- Customer acquisition cost
- Lifetime value calculation
- Growth metrics

---

## Support Workflow

### User Support Process
```
User encounters issue
→ Clicks "Help & Support"
→ Views knowledge base articles
→ If unresolved:
  - Submits support ticket
  - Provides session details
  - Attaches error logs
→ Support team responds
→ Issue resolved or escalated
```

### Support Tiers
- **Tier 1**: Basic issues (FAQs, documentation)
- **Tier 2**: Technical issues (troubleshooting)
- **Tier 3**: Advanced issues (engineering)
- **Priority Support**: Creator plan subscribers

---

## Developer API Workflow

### API Authentication
```
Developer registers application
→ Receives API key and secret
→ Uses OAuth 2.0 for authentication
→ Accesses API endpoints
→ Respects rate limits
→ Handles webhooks for events
```

### API Endpoints
- Session management
- Transformation control
- Webhook configuration
- Analytics retrieval
- User management

---

## Mobile Workflow

### Mobile App Features
- Camera capture and transformation
- Voice recording and processing
- Mobile-optimized UI
- Touch gesture controls
- Battery optimization
- Data saver mode

### Mobile-Specific Considerations
- Limited processing power
- Battery consumption
- Network variability
- Screen size optimization
- Touch interface design

---

## Offline Workflow

### Offline Capabilities
- Download transformation models
- Process without internet
- Queue uploads for later
- Limited feature set offline
- Sync when connection restored

---

## Accessibility Workflow

### Accessibility Features
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size adjustment
- Color blind friendly design
- Caption support for videos

---

## Internationalization Workflow

### Multi-language Support
- Language detection
- Content translation
- Currency localization
- Date/time formatting
- Regional compliance
- Cultural adaptations

---

*This workflow documentation will be continuously updated as the platform evolves and new features are added.*