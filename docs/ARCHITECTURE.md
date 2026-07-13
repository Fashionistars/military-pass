# Military Pass - System Architecture Documentation

## Overview

Military Pass is a distributed, cloud-native real-time AI platform designed for high-performance face and voice transformation. This document describes the system architecture, component interactions, data flow, and technical design decisions that enable the platform to deliver sub-100ms face transformation and sub-200ms voice transformation at scale.

---

## Architectural Principles

### Core Design Principles

1. **Real-time Performance**: All architectural decisions prioritize low latency and high throughput
2. **Scalability**: Horizontal scaling capability to handle 10,000+ concurrent users
3. **Reliability**: 99.9% uptime SLA with graceful degradation
4. **Security**: Defense-in-depth security with encryption at every layer
5. **Privacy-by-Design**: Privacy protection embedded in architecture
6. **Cloud-Native**: Leveraging cloud services for managed operations
7. **Microservices**: Modular, independently deployable services
8. **Event-Driven**: Asynchronous communication for scalability

---

## High-Level Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   Web App    │  │ Mobile App   │  │Virtual Camera│  │   OBS/Zoom   ││
│  │  (Next.js)   │  │ (React Native)│  │   Driver     │  │  Integration ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Edge & CDN Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │  CloudFront  │  │  Cloudflare  │  │  AWS WAF     │  │   Route 53   ││
│  │     CDN      │  │    CDN       │  │   Firewall   │  │     DNS      ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Load Balancing Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   AWS ALB    │  │   NLB        │  │  Global      │  │   Health     ││
│  │ (HTTP/HTTPS) │  │ (WebSocket)  │  │ Accelerator  │  │   Checks     ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Application Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   Frontend   │  │   Backend    │  │   WebSocket  │  │   Auth       ││
│  │   Service    │  │   Service    │  │   Service    │  │   Service    ││
│  │  (Next.js)   │  │  (FastAPI)   │  │  (Socket.io) │  │ (NextAuth)   ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   User      │  │   Credit     │  │   Content    │  │   Session    ││
│  │   Service   │  │   Service    │  │   Service    │  │   Service    ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AI Processing Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │   Face       │  │   Voice      │  │   Model      │  │   GPU        ││
│  │   Engine     │  │   Engine     │  │   Manager    │  │   Pool       ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  InsightFace │  │     RVC      │  │  TensorRT    │                   │
│  │  + GFPGAN    │  │   + Coqui    │  │  Optimizer   │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Data Layer                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ PostgreSQL   │  │    Redis     │  │   S3 Bucket  │  │  RabbitMQ    ││
│  │  (Primary)   │  │   (Cache)    │  │  (Storage)   │  │   (Queue)    ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Monitoring & Observability                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │ Prometheus   │  │   Grafana    │  │  CloudWatch  │  │    Sentry    ││
│  │  (Metrics)   │  │ (Dashboard)  │  │   (Logging)  │  │  (Errors)    ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Client Layer

#### Web Application (Next.js)
- **Purpose**: Primary user interface for web browsers
- **Technology**: Next.js 14, React, TypeScript
- **Features**:
  - Server-side rendering for performance
  - Static generation for SEO
  - API routes for backend communication
  - WebSocket client for real-time updates
- **Deployment**: Vercel or AWS S3 + CloudFront

#### Mobile Application (React Native)
- **Purpose**: Native mobile experience
- **Technology**: React Native, Expo
- **Features**:
  - Native camera integration
  - Offline mode support
  - Push notifications
  - Biometric authentication
- **Deployment**: App Store, Google Play

#### Virtual Camera Driver
- **Purpose**: System-level virtual camera for OBS/Zoom integration
- **Technology**: DirectShow (Windows), AVFoundation (macOS), V4L2 (Linux)
- **Features**:
  - Real-time video injection
  - Multiple resolution support
  - Low-latency streaming
- **Distribution**: Custom installer

### 2. Edge & CDN Layer

#### CloudFront CDN
- **Purpose**: Global content delivery
- **Features**:
  - Static asset caching
  - Dynamic content acceleration
  - Edge caching for API responses
  - DDoS protection
- **Cache Strategy**:
  - Static assets: 1 year
  - API responses: 5 minutes
  - User-specific: no caching

#### Cloudflare CDN
- **Purpose**: Secondary CDN and DDoS protection
- **Features**:
  - DNS management
  - Web Application Firewall
  - Bot protection
  - Rate limiting

#### AWS WAF
- **Purpose**: Web application firewall
- **Rules**:
  - SQL injection protection
  - XSS protection
  - Rate limiting per IP
  - Geo-blocking if needed

### 3. Load Balancing Layer

#### Application Load Balancer (ALB)
- **Purpose**: HTTP/HTTPS traffic distribution
- **Features**:
  - SSL termination
  - Path-based routing
  - Health checks
  - Sticky sessions
- **Algorithm**: Round-robin with least connections

#### Network Load Balancer (NLB)
- **Purpose**: WebSocket traffic distribution
- **Features**:
  - Low latency
  - Static IP addresses
  - Ultra-high throughput
- **Protocol**: TCP (WebSocket upgrade)

#### Global Accelerator
- **Purpose**: Global traffic optimization
- **Features**:
  - Dynamic routing
  - Anycast IP addresses
  - Health-based routing
- **Regions**: US-East, US-West, EU, Asia-Pacific

### 4. Application Layer

#### Frontend Service (Next.js)
- **Purpose**: React application server
- **Scaling**: Horizontal auto-scaling
- **Instances**: t3.medium instances
- **Auto-scaling**: 2-20 instances based on CPU

#### Backend Service (FastAPI)
- **Purpose**: REST API and business logic
- **Scaling**: Horizontal auto-scaling
- **Instances**: t3.large instances
- **Auto-scaling**: 2-30 instances based on requests/sec

#### WebSocket Service (Socket.io)
- **Purpose**: Real-time bidirectional communication
- **Scaling**: Horizontal with Redis adapter
- **Instances**: t3.large instances
- **Auto-scaling**: 2-50 instances based on connections

#### Auth Service (NextAuth)
- **Purpose**: Authentication and authorization
- **Scaling**: Horizontal auto-scaling
- **Instances**: t3.small instances
- **Session Store**: Redis

### 5. Business Logic Layer

#### User Service
- **Purpose**: User management and profiles
- **Features**:
  - User registration/login
  - Profile management
  - Preferences storage
  - Activity tracking
- **Database**: PostgreSQL users table

#### Credit Service
- **Purpose**: Credit management and billing
- **Features**:
  - Credit balance tracking
  - Usage calculation
  - Purchase processing
  - Subscription management
- **Integration**: Stripe, PayPal

#### Content Service
- **Purpose**: Avatar and voice profile management
- **Features**:
  - Content upload/processing
  - Metadata storage
  - Search and filtering
  - Content moderation
- **Storage**: S3 + PostgreSQL metadata

#### Session Service
- **Purpose**: Transformation session management
- **Features**:
  - Session creation/termination
  - Resource allocation
  - Usage tracking
  - Performance monitoring
- **Database**: PostgreSQL sessions table

### 6. AI Processing Layer

#### Face Engine
- **Purpose**: Real-time face transformation
- **Components**:
  - Face Detection (RetinaFace)
  - Face Alignment (5-point landmarks)
  - Face Swap (InsightFace)
  - Face Enhancement (GFPGAN)
- **Performance**: <100ms per frame
- **GPU Requirements**: 8GB VRAM minimum

#### Voice Engine
- **Purpose**: Real-time voice transformation
- **Components**:
  - Voice Activity Detection
  - Noise Reduction (RNNoise)
  - Voice Conversion (RVC)
  - Quality Enhancement
- **Performance**: <200ms per audio chunk
- **GPU Requirements**: 4GB VRAM minimum

#### Model Manager
- **Purpose**: Model loading and optimization
- **Features**:
  - Model versioning
  - TensorRT optimization
  - Dynamic loading/unloading
  - Model caching
- **Storage**: S3 for model artifacts

#### GPU Pool
- **Purpose**: GPU resource management
- **Types**:
  - g4dn.xlarge (1x T4 GPU)
  - g5.xlarge (1x A10G GPU)
  - p3.2xlarge (1x V100 GPU)
- **Scheduling**: Kubernetes GPU scheduling
- **Autoscaling**: Based on queue length

### 7. Data Layer

#### PostgreSQL (Primary Database)
- **Purpose**: Relational data storage
- **Version**: PostgreSQL 15
- **Deployment**: AWS RDS Multi-AZ
- **Features**:
  - Automatic backups
  - Read replicas
  - Point-in-time recovery
  - Encryption at rest
- **Tables**: users, credits, sessions, avatars, voices, transactions

#### Redis (Cache & Session Store)
- **Purpose**: Caching and session management
- **Version**: Redis 7.2
- **Deployment**: AWS ElastiCache Cluster
- **Features**:
  - In-memory caching
  - Session storage
  - Pub/Sub for WebSocket scaling
  - Rate limiting
- **Memory**: 32GB cluster

#### S3 (Object Storage)
- **Purpose**: File storage
- **Features**:
  - Avatar images
  - Voice audio files
  - Model artifacts
  - Temporary processing files
- **Lifecycle**: Automatic cleanup of temp files
- **Encryption**: Server-side encryption

#### RabbitMQ (Message Queue)
- **Purpose**: Asynchronous task processing
- **Version**: RabbitMQ 3.12
- **Deployment**: AWS MQ
- **Queues**:
  - face-processing
  - voice-processing
  - content-moderation
  - analytics-events
- **Features**:
  - Dead letter queues
  - Message persistence
  - Priority queues

### 8. Monitoring & Observability

#### Prometheus (Metrics)
- **Purpose**: Metrics collection
- **Metrics**:
  - Request rate, latency, errors
  - GPU utilization
  - Database performance
  - Queue depths
- **Retention**: 30 days

#### Grafana (Dashboard)
- **Purpose**: Metrics visualization
- **Dashboards**:
  - System overview
  - Performance metrics
  - Business metrics
  - Alert status

#### CloudWatch (Logging)
- **Purpose**: Centralized logging
- **Log Types**:
  - Application logs
  - Access logs
  - Error logs
  - Audit logs
- **Retention**: 90 days

#### Sentry (Error Tracking)
- **Purpose**: Error aggregation and alerting
- **Features**:
  - Stack trace capture
  - User context
  - Release tracking
  - Performance monitoring

---

## Data Flow Architecture

### 1. User Registration Flow

```
User → Web App → ALB → Frontend Service → Auth Service → PostgreSQL
                                   ↓
                                Redis (Session)
                                   ↓
                                Welcome Email
```

### 2. Face Upload Flow

```
User → Web App → ALB → Backend Service → S3 (Raw Image)
                                   ↓
                             RabbitMQ (Face Processing Queue)
                                   ↓
                             AI Worker (Face Detection)
                                   ↓
                             PostgreSQL (Face Metadata)
                                   ↓
                             S3 (Processed Image)
                                   ↓
                             Redis (Cache)
                                   ↓
User ← Web App ← ALB ← Backend Service ←
```

### 3. Real-time Transformation Flow

```
User Camera → Web App → WebSocket → WebSocket Service → RabbitMQ
                                                    ↓
                                              GPU Pool Manager
                                                    ↓
                                              Face Engine
                                                    ↓
                                              Voice Engine
                                                    ↓
WebSocket Service ← Transformed Data ← GPU Pool ←
         ↓
User Display
```

### 4. Credit Purchase Flow

```
User → Web App → Stripe → Webhook → Backend Service → Credit Service
                                          ↓
                                    PostgreSQL
                                          ↓
                                    Email Confirmation
                                          ↓
User ← Web App ← Backend Service ←
```

---

## Scalability Architecture

### Horizontal Scaling Strategy

#### Stateless Services
- **Frontend Service**: Auto-scale 2-20 instances
- **Backend Service**: Auto-scale 2-30 instances
- **WebSocket Service**: Auto-scale 2-50 instances
- **Auth Service**: Auto-scale 2-10 instances

#### Stateful Services
- **PostgreSQL**: Read replicas for read scaling
- **Redis**: Cluster mode for horizontal scaling
- **RabbitMQ**: Cluster for queue scaling

#### GPU Pool Scaling
- **Auto-scaling**: Based on queue length
- **Scale-up**: Queue > 100 tasks
- **Scale-down**: Queue < 10 tasks for 5 minutes
- **Max instances**: 100 GPU instances

### Vertical Scaling Strategy

#### Database Scaling
- **PostgreSQL**: Instance size upgrades
- **Redis**: Memory upgrades
- **Current**: db.r6g.xlarge
- **Maximum**: db.r6g.8xlarge

#### GPU Scaling
- **Instance Types**: g4dn → g5 → p3
- **GPU per Instance**: 1 → 4 → 8 GPUs
- **Current**: g5.xlarge (1x A10G)
- **Maximum**: p3.8xlarge (4x V100)

---

## Security Architecture

### Defense in Depth

#### Layer 1: Network Security
- AWS WAF rules
- DDoS protection (Cloudflare)
- Network ACLs
- Security groups

#### Layer 2: Application Security
- Input validation
- Output encoding
- SQL injection prevention
- XSS protection

#### Layer 3: Data Security
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Key management (AWS KMS)
- Data masking

#### Layer 4: Access Control
- JWT authentication
- RBAC authorization
- API key management
- Rate limiting

#### Layer 5: Monitoring & Auditing
- Security event logging
- Intrusion detection
- Vulnerability scanning
- Penetration testing

### Encryption Strategy

#### Data at Rest
- **Database**: AES-256 encryption
- **S3**: Server-side encryption
- **Redis**: TLS + AUTH
- **Model files**: Customer-managed keys

#### Data in Transit
- **All traffic**: TLS 1.3
- **Internal traffic**: mTLS
- **WebSocket**: WSS (Secure WebSocket)
- **Database**: SSL/TLS

### Key Management
- **Root keys**: AWS KMS
- **Application keys**: Environment variables
- **API keys**: Secure storage
- **Rotation**: Quarterly key rotation

---

## High Availability Architecture

### Redundancy Strategy

#### Compute Redundancy
- **Multi-AZ deployment**: 3 availability zones
- **Auto-scaling**: Automatic instance replacement
- **Health checks**: Continuous health monitoring
- **Failover**: Automatic AZ failover

#### Database Redundancy
- **Multi-AZ RDS**: Automatic failover
- **Read replicas**: 2 read replicas
- **Backups**: Daily backups + transaction logs
- **Point-in-time recovery**: 30-day window

#### Storage Redundancy
- **S3**: 99.999999999% durability
- **Cross-region replication**: Optional
- **Versioning**: Enabled for critical data

### Disaster Recovery

#### RTO (Recovery Time Objective): 1 hour
#### RPO (Recovery Point Objective): 5 minutes

#### Recovery Procedures
1. **Database Failover**: Automatic (<30 seconds)
2. **Instance Recovery**: Auto-scaling replacement (<5 minutes)
3. **Region Failover**: Manual (30-60 minutes)
4. **Data Restore**: From backups (30-60 minutes)

---

## Performance Architecture

### Latency Optimization

#### Edge Computing
- **CDN caching**: 50-200ms reduction
- **Edge regions**: Global distribution
- **Smart routing**: Low-latency paths

#### GPU Optimization
- **TensorRT**: 2-3x faster inference
- **Model quantization**: FP16/INT8
- **Batch processing**: When possible
- **Memory pooling**: Reduce allocation overhead

#### Network Optimization
- **WebSocket compression**: 30-50% bandwidth reduction
- **Binary protocols**: Efficient data transfer
- **Connection pooling**: Reduce handshake overhead
- **HTTP/2**: Multiplexing

### Caching Strategy

#### Multi-level Caching
1. **Browser cache**: Static assets (1 year)
2. **CDN cache**: API responses (5 minutes)
3. **Application cache**: Redis (5-60 minutes)
4. **Database cache**: Query results (1-5 minutes)

#### Cache Invalidation
- **Time-based**: TTL expiration
- **Event-based**: Write-through invalidation
- **Manual**: Admin controls

---

## Deployment Architecture

### CI/CD Pipeline

#### Stages
1. **Code**: Push to GitHub
2. **Build**: Docker image build
3. **Test**: Automated testing
4. **Staging**: Deploy to staging
5. **Production**: Deploy to production

#### Environments
- **Development**: Local development
- **Staging**: Pre-production testing
- **Production**: Live production

#### Deployment Strategy
- **Frontend**: Blue-green deployment
- **Backend**: Rolling updates
- **Database**: Schema migrations
- **Models**: Canary deployments

### Infrastructure as Code

#### Terraform Modules
- **Network**: VPC, subnets, security groups
- **Compute**: EC2, Auto Scaling Groups
- **Database**: RDS, ElastiCache
- **Storage**: S3, EFS
- **Monitoring**: CloudWatch, SNS

#### Configuration Management
- **Environment variables**: AWS Systems Manager
- **Secrets**: AWS Secrets Manager
- **Application config**: Distributed config

---

## Microservices Communication

### Synchronous Communication
- **Protocol**: HTTP/REST
- **Format**: JSON
- **Timeout**: 30 seconds default
- **Retries**: Exponential backoff

### Asynchronous Communication
- **Protocol**: AMQP (RabbitMQ)
- **Format**: JSON
- **Persistence**: Durable queues
- **Dead letter**: Error handling

### Event-Driven Architecture
- **Events**: Session created, credit purchased, etc.
- **Publish/Subscribe**: Fan-out to multiple services
- **Event Sourcing**: Audit trail
- **CQRS**: Read/write separation

---

## Monitoring & Alerting

### Metrics Collection

#### Application Metrics
- Request rate, latency, error rate
- Active sessions, GPU utilization
- Credit consumption, user signups

#### System Metrics
- CPU, memory, disk, network
- Database connections, cache hit rate
- Queue depth, message processing rate

#### Business Metrics
- Daily active users
- Conversion rate
- Revenue metrics
- Churn rate

### Alerting Strategy

#### Critical Alerts (PagerDuty)
- Service down (>5 minutes)
- Error rate >5%
- Database failover
- GPU pool exhaustion

#### Warning Alerts (Email)
- High latency (>200ms)
- Low cache hit rate (<70%)
- Queue backup (>50)
- Disk space >80%

#### Info Alerts (Slack)
- Deployment completed
- New user signup
- High-value transaction

---

## Compliance & Governance

### Data Privacy
- **GDPR Compliance**: Full compliance with EU regulations
- **Data Residency**: EU data stored in EU regions
- **Right to Deletion**: Automated data deletion
- **Consent Management**: Explicit consent tracking

### Audit Trail
- **User Actions**: All user actions logged
- **Admin Actions**: All admin actions logged
- **API Access**: All API calls logged
- **Data Access**: All data access logged

### Compliance Reporting
- **Monthly Reports**: Security, performance, business
- **Quarterly Audits**: Third-party security audits
- **Annual Reviews**: Architecture review
- **Certifications**: SOC 2 Type II (planned)

---

## Future Architecture Enhancements

### Planned Improvements

#### Edge AI Processing
- **Purpose**: Reduce latency further
- **Technology**: AWS Wavelength, Edge computing
- **Expected**: <50ms face transformation

#### Federated Learning
- **Purpose**: Privacy-preserving model updates
- **Technology**: Federated learning frameworks
- **Expected**: Better model accuracy without data sharing

#### Blockchain Integration
- **Purpose**: Content provenance and rights management
- **Technology**: Blockchain or distributed ledger
- **Expected**: Immutable content records

#### 5G Integration
- **Purpose**: Mobile optimization
- **Technology**: 5G network slicing
- **Expected**: Better mobile performance

---

## Architecture Decision Records

### ADR-001: Cloud Provider Selection
**Decision**: AWS as primary cloud provider
**Rationale**:
- Mature GPU offerings (EC2 P3/G4/G5 instances)
- Comprehensive managed services
- Global infrastructure
- Strong security and compliance
**Alternatives Considered**: GCP, Azure
**Status**: Accepted

### ADR-002: Database Selection
**Decision**: PostgreSQL as primary database
**Rationale**:
- ACID compliance
- JSON support for flexible schemas
- Strong ecosystem
- AWS RDS managed service
**Alternatives Considered**: MySQL, MongoDB
**Status**: Accepted

### ADR-003: Framework Selection
**Decision**: Next.js for frontend, FastAPI for backend
**Rationale**:
- Next.js: SSR, SEO, great developer experience
- FastAPI: Async, type hints, automatic docs
- Both have strong community support
**Alternatives Considered**: React+Express, Vue+Django
**Status**: Accepted

### ADR-004: AI Framework Selection
**Decision**: PyTorch as primary ML framework
**Rationale**:
- Pythonic, easy to debug
- Strong research community
- Good GPU support
- Compatible with many AI models
**Alternatives Considered**: TensorFlow, JAX
**Status**: Accepted

---

*This architecture document is a living document and will be updated as the system evolves.*