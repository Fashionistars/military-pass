# Military Pass - Database Schema Documentation

## Overview

Military Pass uses PostgreSQL as its primary database, supported by Redis for caching and session management. This document describes the complete database schema, including tables, relationships, indexes, and data models.

---

## Database Architecture

### Primary Database: PostgreSQL 15
- **Deployment**: AWS RDS Multi-AZ
- **Version**: PostgreSQL 15
- **Extensions**: 
  - `uuid-ossp` - UUID generation
  - `pgcrypto` - Cryptographic functions
  - `pg_trgm` - Trigram matching for search
  - `postgis` - Geographic data (optional)

### Cache Layer: Redis 7.2
- **Deployment**: AWS ElastiCache Cluster
- **Purpose**: Session storage, caching, rate limiting
- **Data Structures**: Strings, Hashes, Sets, Sorted Sets

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │───────│   credits    │───────│ transactions │
└──────────────┘       └──────────────┘       └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────┐       ┌──────────────┐
│   sessions   │───────│  subscriptions│
└──────────────┘       └──────────────┘
       │
       │
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    faces     │───────│    voices    │───────│   presets    │
└──────────────┘       └──────────────┘       └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌──────────────┐       ┌──────────────┐
│  face_usage  │       │ voice_usage  │
└──────────────┘       └──────────────┘
```

---

## Core Tables

### 1. users

Stores user account information and authentication data.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    avatar_url VARCHAR(500),
    date_of_birth DATE,
    country_code CHAR(2),
    timezone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Status fields
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;

-- Triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique user identifier (UUID)
- `email`: User email address (unique)
- `username`: Display username (unique, 3-30 chars, alphanumeric + underscore)
- `password_hash`: Bcrypt hash of password (null for OAuth users)
- `oauth_provider`: OAuth provider (google, facebook, tiktok)
- `oauth_id`: OAuth provider user ID
- `avatar_url`: Profile picture URL
- `date_of_birth`: User date of birth (for age verification)
- `country_code`: ISO 3166-1 alpha-2 country code
- `timezone`: User timezone (IANA format)
- `language`: User language preference (ISO 639-1)
- `is_verified`: Email verification status
- `is_active`: Account active status
- `is_suspended`: Account suspension status
- `suspension_reason`: Reason for suspension
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_login_at`: Last successful login timestamp
- `deleted_at`: Soft delete timestamp (null if not deleted)
- `metadata`: Additional user data in JSON format

---

### 2. credits

Manages user credit balances and transactions.

```sql
CREATE TABLE credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Credit type
    credit_type VARCHAR(20) NOT NULL DEFAULT 'standard',
    -- Values: standard, promotional, subscription, referral
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT non_negative_balance CHECK (balance >= 0),
    CONSTRAINT valid_currency CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP'))
);

-- Indexes
CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_expires_at ON credits(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_credits_credit_type ON credits(credit_type);

-- Triggers
CREATE TRIGGER update_credits_updated_at
    BEFORE UPDATE ON credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique credit record identifier
- `user_id`: Reference to user
- `balance`: Current credit balance
- `currency`: Currency code (ISO 4217)
- `credit_type`: Type of credits
- `expires_at`: Credit expiration date (null for non-expiring credits)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp
- `metadata`: Additional credit data

---

### 3. transactions

Records all credit transactions (purchases, usage, refunds).

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL,
    -- Values: purchase, usage, refund, bonus, penalty, subscription
    
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Payment details
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),
    payment_provider VARCHAR(50),
    -- Values: stripe, paypal, flutterwave, paystack
    
    -- Session reference (for usage transactions)
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Package reference (for purchase transactions)
    package_id VARCHAR(50),
    
    -- Description
    description TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    -- Values: pending, completed, failed, refunded
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'purchase', 'usage', 'refund', 'bonus', 'penalty', 'subscription'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'completed', 'failed', 'refunded'
    ))
);

-- Indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_session_id ON transactions(session_id);
CREATE INDEX idx_transactions_payment_id ON transactions(payment_id);

-- Triggers
CREATE TRIGGER update_transactions_processed_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_processed_at_column();
```

**Fields Description**:
- `id`: Unique transaction identifier
- `user_id`: Reference to user
- `transaction_type`: Type of transaction
- `amount`: Transaction amount (positive for credits added, negative for credits used)
- `balance_after`: Balance after transaction
- `currency`: Transaction currency
- `payment_method`: Payment method used
- `payment_id`: Payment gateway transaction ID
- `payment_provider`: Payment gateway provider
- `session_id`: Reference to session (for usage tracking)
- `package_id`: Reference to credit package
- `description`: Transaction description
- `status`: Transaction status
- `created_at`: Transaction creation timestamp
- `processed_at`: Transaction processing timestamp
- `metadata`: Additional transaction data

---

### 4. subscriptions

Manages user subscription plans and billing.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    -- Values: starter, basic, pro, ultimate, creator
    
    plan_name VARCHAR(100) NOT NULL,
    monthly_credits INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'NGN',
    
    -- Subscription status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Values: active, paused, cancelled, expired, trialing
    
    -- Billing cycle
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    -- Values: monthly, yearly
    
    -- Dates
    start_date DATE NOT NULL,
    next_billing_date DATE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment details
    payment_method_id VARCHAR(255),
    payment_provider VARCHAR(50) DEFAULT 'stripe',
    
    -- Credits rollover
    credits_rollover INTEGER DEFAULT 0,
    max_rollover_months INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_plan CHECK (plan_id IN (
        'starter', 'basic', 'pro', 'ultimate', 'creator'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'active', 'paused', 'cancelled', 'expired', 'trialing'
    )),
    CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);

-- Triggers
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique subscription identifier
- `user_id`: Reference to user
- `plan_id`: Plan identifier
- `plan_name`: Human-readable plan name
- `monthly_credits`: Credits allocated per billing cycle
- `price`: Subscription price
- `currency`: Subscription currency
- `status`: Subscription status
- `billing_cycle`: Billing frequency
- `start_date`: Subscription start date
- `next_billing_date`: Next billing date
- `cancel_at_period_end`: Cancel at end of current period
- `cancelled_at`: Cancellation timestamp
- `expires_at`: Subscription expiration date
- `payment_method_id`: Payment method identifier
- `payment_provider`: Payment gateway provider
- `credits_rollover: Rolled over credits from previous periods
- `max_rollover_months`: Maximum months of rollover allowed
- `created_at`: Subscription creation timestamp
- `updated_at`: Last update timestamp
- `metadata`: Additional subscription data

---

### 5. sessions

Manages transformation sessions and their metadata.

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Transformation settings
    face_id UUID REFERENCES faces(id) ON DELETE SET NULL,
    voice_id UUID REFERENCES voices(id) ON DELETE SET NULL,
    
    -- Session settings (JSON)
    settings JSONB NOT NULL DEFAULT '{}',
    -- Structure:
    -- {
    --   "face": {
    --     "intensity": 80,
    --     "enableEnhancement": true,
    --     "quality": "hd"
    --   },
    --   "voice": {
    --     "pitchShift": 2,
    --     "speedFactor": 1.0,
    --     "noiseReduction": true
    --   },
    --   "output": {
    --     "resolution": "1080p",
    --     "frameRate": 30,
    --     "bitrate": 6000
    --   }
    -- }
    
    -- Session status
    status VARCHAR(20) NOT NULL DEFAULT 'initializing',
    -- Values: initializing, active, paused, completed, failed, terminated
    
    -- GPU allocation
    gpu_instance_id VARCHAR(255),
    gpu_region VARCHAR(50),
    
    -- Performance metrics
    duration_seconds INTEGER DEFAULT 0,
    total_frames_processed INTEGER DEFAULT 0,
    total_audio_chunks_processed INTEGER DEFAULT 0,
    avg_latency_ms INTEGER,
    peak_latency_ms INTEGER,
    avg_fps DECIMAL(5, 2),
    gpu_utilization_percent INTEGER,
    
    -- Credit usage
    credits_per_minute DECIMAL(5, 2) NOT NULL,
    total_credits_used DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Platform integration
    platform VARCHAR(50),
    stream_id VARCHAR(255),
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'initializing', 'active', 'paused', 'completed', 'failed', 'terminated'
    ))
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_face_id ON sessions(face_id);
CREATE INDEX idx_sessions_voice_id ON sessions(voice_id);
CREATE INDEX idx_sessions_platform ON sessions(platform);

-- Triggers
CREATE TRIGGER update_sessions_timestamps
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamps();
```

**Fields Description**:
- `id`: Unique session identifier
- `user_id`: Reference to user
- `session_token`: Unique session token for WebSocket authentication
- `face_id`: Reference to face profile used
- `voice_id`: Reference to voice profile used
- `settings`: Session settings in JSON format
- `status`: Session status
- `gpu_instance_id`: GPU instance identifier
- `gpu_region`: GPU region
- `duration_seconds`: Session duration in seconds
- `total_frames_processed`: Total video frames processed
- `total_audio_chunks_processed`: Total audio chunks processed
- `avg_latency_ms`: Average processing latency in milliseconds
- `peak_latency_ms`: Peak processing latency in milliseconds
- `avg_fps`: Average frames per second
- `gpu_utilization_percent`: Average GPU utilization percentage
- `credits_per_minute`: Credits consumed per minute
- `total_credits_used`: Total credits consumed in session
- `platform`: Platform integrated with (obs, zoom, twitch, etc.)
- `stream_id`: Stream identifier
- `error_code`: Error code if session failed
- `error_message`: Error message if session failed
- `created_at`: Session creation timestamp
- `started_at`: Session start timestamp
- `ended_at`: Session end timestamp
- `metadata`: Additional session data

---

### 6. faces

Stores user face profiles and metadata.

```sql
CREATE TABLE faces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Face identification
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Image storage
    original_image_url VARCHAR(500) NOT NULL,
    processed_image_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    
    -- Face embeddings (vector)
    embedding VECTOR(512),
    
    -- Face detection data
    face_detected BOOLEAN NOT NULL DEFAULT TRUE,
    face_count INTEGER DEFAULT 1,
    face_quality_score DECIMAL(3, 2),
    -- 0.00 to 1.00, higher is better
    
    -- Image metadata
    image_width INTEGER,
    image_height INTEGER,
    file_size_bytes INTEGER,
    file_format VARCHAR(10),
    -- Values: jpg, png, webp
    
    -- Processing status
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Values: pending, processing, completed, failed
    
    -- Face settings
    settings JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "intensity": 80,
    --   "enableEnhancement": true,
    --   "faceMappingMode": "single",
    --   "mouthMask": false,
    --   "qualityLevel": "high"
    -- }
    
    -- Visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending',
    -- Values: pending, approved, rejected, flagged
    moderation_note TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by UUID REFERENCES users(id),
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_file_format CHECK (file_format IN ('jpg', 'png', 'webp')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
        'pending', 'approved', 'rejected', 'flagged'
    ))
);

-- Indexes
CREATE INDEX idx_faces_user_id ON faces(user_id);
CREATE INDEX idx_faces_is_public ON faces(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_faces_is_default ON faces(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_faces_moderation_status ON faces(moderation_status);
CREATE INDEX idx_faces_created_at ON faces(created_at);
CREATE INDEX idx_faces_usage_count ON faces(usage_count);

-- Triggers
CREATE TRIGGER update_faces_updated_at
    BEFORE UPDATE ON faces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique face identifier
- `user_id`: Reference to user
- `name`: Face profile name
- `description`: Face profile description
- `original_image_url`: Original uploaded image URL
- `processed_image_url`: Processed image URL
- `thumbnail_url`: Thumbnail image URL
- `embedding`: Face embedding vector (512 dimensions)
- `face_detected`: Whether face was detected
- `face_count`: Number of faces detected
- `face_quality_score`: Quality score of detected face
- `image_width`: Image width in pixels
- `image_height`: Image height in pixels
- `file_size_bytes`: File size in bytes
- `file_format`: Image file format
- `processing_status`: Processing status
- `settings`: Face transformation settings
- `is_public`: Whether face is publicly visible
- `is_default`: Whether this is the default face
- `moderation_status`: Content moderation status
- `moderation_note`: Moderation notes
- `moderated_at`: Moderation timestamp
- `moderated_by`: User who moderated
- `usage_count`: Number of times used
- `last_used_at`: Last usage timestamp
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp
- `metadata`: Additional face data

---

### 7. voices

Stores user voice profiles and metadata.

```sql
CREATE TABLE voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Voice identification
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Audio storage
    original_audio_url VARCHAR(500) NOT NULL,
    processed_audio_url VARCHAR(500),
    preview_url VARCHAR(500),
    
    -- Voice embeddings (vector)
    embedding VECTOR(256),
    
    -- Audio metadata
    duration_seconds DECIMAL(10, 2) NOT NULL,
    sample_rate INTEGER,
    bit_depth INTEGER,
    channels INTEGER DEFAULT 1,
    file_size_bytes INTEGER,
    file_format VARCHAR(10),
    -- Values: wav, mp3, m4a
    
    -- Voice characteristics
    voice_quality_score DECIMAL(3, 2),
    -- 0.00 to 1.00, higher is better
    
    characteristics JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "pitch": "medium",
    --   "timbre": "warm",
    --   "speed": "normal",
    --   "gender": "male",
    --   "age": "adult"
    -- }
    
    -- Processing status
    processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- Values: pending, processing, completed, failed
    
    -- Voice settings
    settings JSONB DEFAULT '{}',
    -- Structure:
    -- {
    --   "pitchShift": 2,
    --   "speedFactor": 1.0,
    --   "timbreChange": 50,
    --   "noiseReduction": true,
    --   "formantShift": 30
    -- }
    
    -- Visibility
    is_public BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending',
    moderation_note TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by UUID REFERENCES users(id),
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_file_format CHECK (file_format IN ('wav', 'mp3', 'm4a')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    CONSTRAINT valid_moderation_status CHECK (moderation_status IN (
        'pending', 'approved', 'rejected', 'flagged'
    ))
);

-- Indexes
CREATE INDEX idx_voices_user_id ON voices(user_id);
CREATE INDEX idx_voices_is_public ON voices(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_voices_is_default ON voices(is_default) WHERE is_default = TRUE;
CREATE INDEX idx_voices_moderation_status ON voices(moderation_status);
CREATE INDEX idx_voices_created_at ON voices(created_at);
CREATE INDEX idx_voices_usage_count ON voices(usage_count);

-- Triggers
CREATE TRIGGER update_voices_updated_at
    BEFORE UPDATE ON voices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique voice identifier
- `user_id`: Reference to user
- `name`: Voice profile name
- `description`: Voice profile description
- `original_audio_url`: Original uploaded audio URL
- `processed_audio_url`: Processed audio URL
- `preview_url`: Preview audio URL
- `embedding`: Voice embedding vector (256 dimensions)
- `duration_seconds`: Audio duration in seconds
- `sample_rate`: Audio sample rate in Hz
- `bit_depth`: Audio bit depth
- `channels`: Number of audio channels
- `file_size_bytes`: File size in bytes
- `file_format`: Audio file format
- `voice_quality_score`: Quality score of voice sample
- `characteristics`: Voice characteristics in JSON
- `processing_status`: Processing status
- `settings`: Voice transformation settings
- `is_public`: Whether voice is publicly visible
- `is_default`: Whether this is the default voice
- `moderation_status`: Content moderation status
- `moderation_note`: Moderation notes
- `moderated_at`: Moderation timestamp
- `moderated_by`: User who moderated
- `usage_count`: Number of times used
- `last_used_at`: Last usage timestamp
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp
- `metadata`: Additional voice data

---

### 8. presets

Stores system-provided preset avatars and voices.

```sql
CREATE TABLE presets (
    id VARCHAR(50) PRIMARY KEY,
    -- Format: preset_type_unique_id (e.g., face_cyberpunk_001)
    
    preset_type VARCHAR(20) NOT NULL,
    -- Values: face, voice
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Media URLs
    media_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    preview_url VARCHAR(500),
    
    -- Categories
    category VARCHAR(50),
    tags TEXT[],
    
    -- Sorting
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    min_plan_level VARCHAR(20),
    -- Values: free, starter, basic, pro, ultimate, creator
    
    -- Usage statistics
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_preset_type CHECK (preset_type IN ('face', 'voice')),
    CONSTRAINT valid_min_plan CHECK (min_plan_level IN (
        'free', 'starter', 'basic', 'pro', 'ultimate', 'creator'
    ))
);

-- Indexes
CREATE INDEX idx_presets_preset_type ON presets(preset_type);
CREATE INDEX idx_presets_category ON presets(category);
CREATE INDEX idx_presets_is_active ON presets(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_presets_is_featured ON presets(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_presets_tags ON presets USING GIN(tags);

-- Triggers
CREATE TRIGGER update_presets_updated_at
    BEFORE UPDATE ON presets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Fields Description**:
- `id`: Unique preset identifier
- `preset_type`: Type of preset (face or voice)
- `name`: Preset name
- `description`: Preset description
- `media_url`: Main media file URL
- `thumbnail_url`: Thumbnail image URL
- `preview_url`: Preview media URL
- `category`: Preset category
- `tags`: Array of tags for search
- `sort_order`: Display order
- `is_featured`: Whether preset is featured
- `is_active`: Whether preset is active
- `min_plan_level`: Minimum plan required
- `usage_count`: Number of times used
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `metadata`: Additional preset data

---

### 9. face_usage

Tracks face profile usage in sessions.

```sql
CREATE TABLE face_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    face_id UUID NOT NULL REFERENCES faces(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Usage metrics
    frames_processed INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER,
    peak_processing_time_ms INTEGER,
    
    -- Quality metrics
    avg_quality_score DECIMAL(3, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_face_usage_face_id ON face_usage(face_id);
CREATE INDEX idx_face_usage_session_id ON face_usage(session_id);
CREATE INDEX idx_face_usage_created_at ON face_usage(created_at);
```

**Fields Description**:
- `id`: Unique usage record identifier
- `face_id`: Reference to face
- `session_id`: Reference to session
- `frames_processed`: Number of frames processed
- `avg_processing_time_ms`: Average processing time
- `peak_processing_time_ms`: Peak processing time
- `avg_quality_score`: Average quality score
- `created_at`: Record creation timestamp

---

### 10. voice_usage

Tracks voice profile usage in sessions.

```sql
CREATE TABLE voice_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voice_id UUID NOT NULL REFERENCES voices(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Usage metrics
    audio_chunks_processed INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER,
    peak_processing_time_ms INTEGER,
    
    -- Quality metrics
    avg_quality_score DECIMAL(3, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_voice_usage_voice_id ON voice_usage(voice_id);
CREATE INDEX idx_voice_usage_session_id ON voice_usage(session_id);
CREATE INDEX idx_voice_usage_created_at ON voice_usage(created_at);
```

**Fields Description**:
- `id`: Unique usage record identifier
- `voice_id`: Reference to voice
- `session_id`: Reference to session
- `audio_chunks_processed`: Number of audio chunks processed
- `avg_processing_time_ms`: Average processing time
- `peak_processing_time_ms`: Peak processing time
- `avg_quality_score`: Average quality score
- `created_at`: Record creation timestamp

---

## Supporting Tables

### 11. webhooks

Stores webhook configurations for event notifications.

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Webhook configuration
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    -- Values: session.completed, credit.low, subscription.renewed, etc.
    
    -- Security
    secret VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Statistics
    total_sent INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active) WHERE is_active = TRUE;

-- Triggers
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 12. api_keys

Stores API keys for developer access.

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- API key details
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    
    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT '{}',
    -- Values: read, write, admin
    
    -- Rate limits
    rate_limit_per_minute INTEGER DEFAULT 60,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage statistics
    last_used_at TIMESTAMP WITH TIME ZONE,
    total_requests INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = TRUE;

-- Triggers
CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 13. audit_logs

Stores audit trail for security and compliance.

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Result
    status VARCHAR(20) NOT NULL,
    -- Values: success, failure
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
```

---

## Redis Data Structures

### Session Storage
```
Key: session:{session_id}
Type: Hash
Fields:
  - user_id: UUID
  - face_id: UUID
  - voice_id: UUID
  - status: string
  - created_at: timestamp
  - last_activity: timestamp
TTL: 24 hours
```

### User Sessions
```
Key: user_sessions:{user_id}
Type: Set
Members: session_ids
TTL: 24 hours
```

### Rate Limiting
```
Key: rate_limit:{user_id}:{endpoint}
Type: String
Value: request_count
TTL: 60 seconds
```

### Credit Cache
```
Key: credits:{user_id}
Type: Hash
Fields:
  - balance: decimal
  - updated_at: timestamp
TTL: 5 minutes
```

### GPU Pool Status
```
Key: gpu_pool:{region}
Type: Hash
Fields:
  - available: integer
  - total: integer
  - queue_size: integer
TTL: 30 seconds
```

---

## Database Functions

### Common Trigger Functions

```sql
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update processed_at timestamp
CREATE OR REPLACE FUNCTION update_processed_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'completed' THEN
        NEW.processed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update session timestamps
CREATE OR REPLACE FUNCTION update_session_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'active' AND NEW.status = 'active' THEN
        NEW.started_at = CURRENT_TIMESTAMP;
    END IF;
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
        NEW.ended_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Strategy

### Version Control
- Use database migration scripts
- Version with semantic versioning
- Rollback capability for each migration
- Test migrations in staging first

### Migration Tools
- **Development**: Prisma Migrate
- **Production**: Alembic (Python)
- **Backup**: pg_dump before migrations

### Migration Process
1. Create migration file
2. Test in development
3. Test in staging
4. Backup production database
5. Apply migration
6. Verify integrity
7. Monitor performance

---

## Backup Strategy

### Backup Schedule
- **Daily**: Full backups at 2 AM UTC
- **Hourly**: Transaction log backups
- **Real-time**: Read replica for quick recovery

### Retention Policy
- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks
- **Monthly backups**: 12 months

### Recovery Testing
- Weekly restore tests
- Disaster recovery drills monthly
- Documentation updates quarterly

---

## Performance Optimization

### Indexing Strategy
- Index all foreign keys
- Index frequently queried columns
- Use partial indexes for filtering
- Monitor index usage

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Optimize JOIN operations
- Use connection pooling
- Implement query caching

### Partitioning
- Consider partitioning large tables by date
- Partition tables: sessions, transactions, audit_logs
- Use partition pruning for queries

---

## Security Considerations

### Data Encryption
- Enable TDE (Transparent Data Encryption)
- Encrypt sensitive columns with pgcrypto
- Use SSL for database connections

### Access Control
- Least privilege principle
- Role-based access control
- Regular access reviews

### Auditing
- Enable comprehensive logging
- Monitor audit logs regularly
- Alert on suspicious activity

---

*This database schema documentation will be updated as the platform evolves.*