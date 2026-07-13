# Military Pass - Cloud Infrastructure Requirements

## Overview

Military Pass operates on AWS cloud infrastructure, designed for high availability, scalability, and performance. This document details the complete infrastructure requirements, including services, networking, security, and deployment configurations.

---

## Cloud Provider Selection

### Primary Provider: AWS
**Rationale**:
- Mature GPU offerings (EC2 P3/G4/G5 instances)
- Comprehensive managed services
- Global infrastructure coverage
- Strong security and compliance
- Excellent developer tooling

### Alternative Providers (Future Consideration)
- **Google Cloud Platform**: Competitive GPU pricing
- **Azure**: Enterprise integration benefits
- **Multi-cloud strategy**: For redundancy and cost optimization

---

## Infrastructure Regions

### Primary Region: us-east-1 (N. Virginia)
**Purpose**: Main production region
**Services**: All core services
**Capacity**: 70% of total infrastructure

### Secondary Region: us-west-2 (Oregon)
**Purpose**: Disaster recovery and load balancing
**Services**: Read replicas, backup GPU capacity
**Capacity**: 20% of total infrastructure

### Additional Regions (Future Expansion)
- **eu-west-1 (Ireland)**: European market
- **ap-southeast-1 (Singapore)**: Asia-Pacific market
- **sa-east-1 (São Paulo)**: South American market

---

## Compute Infrastructure

### EC2 Instances

#### Frontend Services (Next.js)
**Instance Type**: t3.medium
**Specifications**:
- 2 vCPUs
- 4 GB RAM
- Network: Moderate to high
**Auto-scaling**: 2-20 instances
**Target**: 50% CPU utilization
**AMI**: Amazon Linux 2023 with Docker

#### Backend Services (FastAPI)
**Instance Type**: t3.large
**Specifications**:
- 2 vCPUs
- 8 GB RAM
- Network: High
**Auto-scaling**: 2-30 instances
**Target**: 60% CPU utilization
**AMI**: Amazon Linux 2023 with Docker

#### WebSocket Services (Socket.io)
**Instance Type**: t3.large
**Specifications**:
- 2 vCPUs
- 8 GB RAM
- Network: Ultra-high
**Auto-scaling**: 2-50 instances
**Target**: 70% CPU utilization
**AMI**: Amazon Linux 2023 with Docker

#### AI Processing Services (GPU)
**Instance Types**:
- **g4dn.xlarge**: 1x T4 GPU, 4 vCPUs, 16 GB RAM
- **g5.xlarge**: 1x A10G GPU, 4 vCPUs, 16 GB RAM
- **p3.2xlarge**: 1x V100 GPU, 8 vCPUs, 61 GB RAM
**Auto-scaling**: 0-100 instances
**Target**: Queue-based scaling
**AMI**: Deep Learning AMI (Ubuntu 22.04)

#### GPU Pool Configuration
**Reserved Instances**: 20% of baseline capacity
**Spot Instances**: 80% of scaling capacity
**Placement Groups**: Cluster for low latency
**EBS Optimization**: Enabled

### Kubernetes (EKS)

#### Cluster Configuration
**Cluster Name**: militarypass-prod
**Version**: Kubernetes 1.29
**Node Groups**:
- **frontend-nodes**: t3.medium, 2-20 nodes
- **backend-nodes**: t3.large, 2-30 nodes
- **websocket-nodes**: t3.large, 2-50 nodes
- **gpu-nodes**: g5.xlarge, 0-100 nodes

#### EKS Add-ons
- **AWS Load Balancer Controller**: For ALB/NLB integration
- **Cluster Autoscaler**: For automatic node scaling
- **Metrics Server**: For resource monitoring
- **AWS VPC CNI**: For pod networking

---

## Networking Infrastructure

### VPC Configuration

#### VPC CIDR: 10.0.0.0/16
**Subnets**:
- **Public Subnets**: 10.0.1.0/24, 10.0.2.0/24 (2 subnets, 2 AZs)
- **Private Subnets**: 10.0.10.0/24, 10.0.11.0/24 (2 subnets, 2 AZs)
- **GPU Subnets**: 10.0.20.0/24, 10.0.21.0/24 (2 subnets, 2 AZs)
- **Database Subnets**: 10.0.30.0/24, 10.0.31.0/24 (2 subnets, 2 AZs)

#### Availability Zones
- **us-east-1a**: Primary
- **us-east-1b**: Secondary

### Network Components

#### Internet Gateway
- **ID**: igw-0xxxxxxxx
- **Purpose**: Public internet access
- **Attached to**: VPC

#### NAT Gateways
- **NAT Gateway 1**: us-east-1a public subnet
- **NAT Gateway 2**: us-east-1b public subnet
- **Purpose**: Outbound internet access for private subnets

#### Route Tables
- **Public Route Table**: Routes to Internet Gateway
- **Private Route Table**: Routes to NAT Gateways
- **GPU Route Table**: Routes to NAT Gateways
- **Database Route Table**: No internet access

#### Security Groups

**Frontend Security Group**:
- **Inbound**: HTTP (80), HTTPS (443) from ALB
- **Outbound**: All traffic to backend services

**Backend Security Group**:
- **Inbound**: HTTPS (443) from ALB and frontend
- **Outbound**: All traffic to database and external APIs

**WebSocket Security Group**:
- **Inbound**: WebSocket (443) from NLB
- **Outbound**: All traffic to backend and GPU services

**GPU Security Group**:
- **Inbound**: Custom protocol from backend services
- **Outbound**: All traffic to S3 and database

**Database Security Group**:
- **Inbound**: PostgreSQL (5432) from backend subnets
- **Outbound**: No outbound traffic

### Load Balancing

#### Application Load Balancer (ALB)
**Type**: Application Load Balancer
**Scheme**: Internet-facing
**Listeners**:
- **HTTP (80)**: Redirects to HTTPS
- **HTTPS (443)**: SSL termination
**Target Groups**:
- **frontend-tg**: t3.medium instances
- **backend-tg**: t3.large instances
**SSL Certificate**: ACM certificate (militarypass.com)

#### Network Load Balancer (NLB)
**Type**: Network Load Balancer
**Scheme**: Internet-facing
**Listeners**:
- **TCP (443)**: WebSocket traffic
**Target Groups**:
- **websocket-tg**: t3.large instances
**Cross-Zone Load Balancing**: Enabled

#### Internal Load Balancer
**Type**: Application Load Balancer
**Scheme**: Internal
**Purpose**: Internal service communication
**Target Groups**:
- **internal-services**: Backend services

### DNS and CDN

#### Route 53
**Hosted Zone**: militarypass.com
**Records**:
- **militarypass.com**: A record → ALB
- **api.militarypass.com**: A record → ALB
- **ws.militarypass.com**: A record → NLB
- **cdn.militarypass.com**: CNAME → CloudFront

#### CloudFront Distribution
**Origin**: ALB and S3 buckets
**Behaviors**:
- **Static assets**: Cache in CloudFront
- **API responses**: Cache for 5 minutes
- **User-specific**: No caching
**SSL Certificate**: ACM certificate
**Price Class**: Use only US and Europe

---

## Storage Infrastructure

### S3 Buckets

#### militarypass-uploads
**Purpose**: User uploads (faces, voices)
**Region**: us-east-1
**Access**: Private with signed URLs
**Versioning**: Enabled
**Lifecycle Rules**:
- **Transition to IA**: After 30 days
- **Transition to Glacier**: After 90 days
- **Expiration**: After 365 days

#### militarypass-models
**Purpose**: AI model storage
**Region**: us-east-1
**Access**: Private (internal only)
**Versioning**: Enabled
**Lifecycle Rules**: None (permanent storage)

#### militarypass-backups
**Purpose**: Database backups
**Region**: us-east-1
**Access**: Private (admin only)
**Versioning**: Enabled
**Lifecycle Rules**:
- **Transition to Glacier**: After 30 days
- **Expiration**: After 90 days

#### militarypass-logs
**Purpose**: Application logs
**Region**: us-east-1
**Access**: Private (admin only)
**Versioning**: Disabled
**Lifecycle Rules**:
- **Transition to Glacier**: After 7 days
- **Expiration**: After 30 days

#### militarypass-static
**Purpose**: Static website assets
**Region**: us-east-1
**Access**: Public (via CloudFront)
**Versioning**: Enabled
**Lifecycle Rules**: None

### EBS Volumes

#### General Purpose SSD (gp3)
**Purpose**: Application data
**Size**: 100 GB per instance
**IOPS**: 3,000
**Throughput**: 125 MB/s
**Encryption**: Enabled

#### Provisioned IOPS SSD (io2)
**Purpose**: Database storage
**Size**: 500 GB per instance
**IOPS**: 10,000
**Throughput**: 250 MB/s
**Encryption**: Enabled

### EFS (Elastic File System)
**Purpose**: Shared file storage
**Size**: Up to 1 TB
**Performance Mode**: Max I/O
**Throughput Mode**: Provisioned (100 MB/s)
**Encryption**: Enabled

---

## Database Infrastructure

### RDS PostgreSQL

#### Production Instance
**Instance Type**: db.r6g.xlarge
**Specifications**:
- 4 vCPUs
- 32 GB RAM
- 500 GB gp3 storage
**Engine**: PostgreSQL 15
**Multi-AZ**: Enabled
**Read Replicas**: 2 (db.r6g.large)
**Backup Retention**: 30 days
**Maintenance Window**: Sunday 3:00-4:00 AM UTC
**Parameter Group**: Custom parameter group
**Security Group**: Database security group

#### Staging Instance
**Instance Type**: db.t3.medium
**Specifications**:
- 2 vCPUs
- 4 GB RAM
- 100 GB gp3 storage
**Engine**: PostgreSQL 15
**Multi-AZ**: Disabled
**Read Replicas**: 0
**Backup Retention**: 7 days

### ElastiCache Redis

#### Production Cluster
**Node Type**: cache.r6g.large
**Specifications**:
- 2 vCPUs
- 13 GB RAM per node
**Cluster Mode**: Enabled
**Shards**: 3
**Replicas per Shard**: 1
**Total Memory**: 39 GB
**Engine**: Redis 7.2
**Maintenance Window**: Sunday 2:00-3:00 AM UTC
**Parameter Group**: Custom parameter group
**Security Group**: Database security group

#### Staging Instance
**Node Type**: cache.t3.medium
**Specifications**:
- 2 vCPUs
- 3 GB RAM
**Cluster Mode**: Disabled
**Engine**: Redis 7.2
**Maintenance Window**: Sunday 2:00-3:00 AM UTC

---

## Message Queue Infrastructure

### Amazon MQ (RabbitMQ)

#### Production Instance
**Instance Type**: mq.m5.large
**Specifications**:
- 2 vCPUs
- 8 GB RAM
**Engine**: RabbitMQ 3.12
**Deployment Mode**: Active/Standby
**Publicly Accessible**: No
**Maintenance Window**: Sunday 4:00-5:00 AM UTC
**Security Group**: Backend security group

#### Queues
- **face-processing**: High priority
- **voice-processing**: High priority
- **content-moderation**: Normal priority
- **analytics-events**: Low priority
- **email-notifications**: Low priority

---

## Security Infrastructure

### WAF (Web Application Firewall)
**Web ACL**: militarypass-waf
**Rules**:
- **AWS Managed Rules**: Common vulnerabilities
- **Rate Limiting**: 2,000 requests per IP per minute
- **SQL Injection**: Block
- **XSS**: Block
- **Geo-blocking**: Optional (based on requirements)
**Associated Resources**: ALB, CloudFront

### Shield Advanced
**Protection**: Enabled for ALB and CloudFront
**DDoS Protection**: Always on
**Cost Protection**: Enabled

### KMS (Key Management Service)
**Customer Managed Keys**:
- **militarypass-database-key**: Database encryption
- **militarypass-storage-key**: S3 encryption
- **militarypass-secrets-key**: Secrets encryption
**Key Rotation**: Enabled (90 days)
**Key Policies**: Least privilege access

### Secrets Manager
**Secrets Stored**:
- Database credentials
- API keys
- OAuth tokens
- Stripe API keys
- SendGrid API keys
**Rotation**: Enabled (30 days)
**Access**: IAM role-based

### IAM Roles and Policies

#### Service Roles
- **EC2 Role**: For EC2 instances to access S3, CloudWatch
- **EKS Role**: For EKS cluster to manage resources
- **Lambda Role**: For Lambda functions to access services
- **RDS Role**: For RDS to access S3 for backups

#### Policies
- **Least Privilege**: Each role has minimum required permissions
- **Resource Tagging**: Resources tagged for cost allocation
- **MFA Required**: For console access
- **Access Review**: Quarterly

---

## Monitoring and Logging

### CloudWatch
**Metrics Collected**:
- CPU utilization
- Memory utilization
- Network traffic
- Disk usage
- Request count
- Error rate
- Latency

**Dashboards**:
- **System Overview**: High-level system health
- **Performance Metrics**: Latency, throughput
- **Business Metrics**: User sessions, credits used
- **Alert Status**: Active alerts and incidents

**Alarms**:
- **High CPU**: >80% for 5 minutes
- **High Memory**: >80% for 5 minutes
- **High Error Rate**: >5% for 5 minutes
- **High Latency**: >200ms for 5 minutes
- **Disk Space**: >80% for 5 minutes

### CloudWatch Logs
**Log Groups**:
- **/militarypass/frontend**: Frontend application logs
- **/militarypass/backend**: Backend application logs
- **/militarypass/websocket**: WebSocket service logs
- **/militarypass/gpu**: GPU processing logs
- **/militarypass/security**: Security and audit logs

**Log Retention**: 90 days
**Log Streams**: Automatic stream creation

### X-Ray
**Enabled**: For distributed tracing
**Sampling**: 10% of requests
**Segments**: Frontend, Backend, Database, External APIs

### S3 Access Logs
**Enabled**: For S3 buckets
**Destination**: militarypass-logs bucket
**Retention**: 30 days

---

## Content Delivery

### CloudFront
**Distribution ID**: EXXXXXXXXXXXXX
**Origins**:
- **ALB Origin**: For dynamic content
- **S3 Origin**: For static content
**Behaviors**:
- **/api/***: Cache for 5 minutes
- **/static/***: Cache for 1 year
- **/* - Default**: Cache for 1 hour
**Geo Restriction**: None
**Compression**: Enabled
**Field Level Encryption**: Disabled

---

## DevOps Infrastructure

### CodePipeline
**Pipelines**:
- **frontend-pipeline**: Frontend deployment
- **backend-pipeline**: Backend deployment
- **infrastructure-pipeline**: Infrastructure updates

**Stages**:
1. **Source**: GitHub
2. **Build**: CodeBuild
3. **Test**: Automated tests
4. **Deploy**: Staging
5. **Approve**: Manual approval
6. **Deploy**: Production

### CodeBuild
**Build Projects**:
- **frontend-build**: Next.js build
- **backend-build**: Docker image build
- **test-runner**: Automated test execution

**Build Spec**:
- **Environment**: Docker
- **Compute**: 3 GB memory, 2 vCPUs
- **Timeout**: 30 minutes

### CodeDeploy
**Applications**:
- **frontend-app**: Frontend deployment
- **backend-app**: Backend deployment

**Deployment Configurations**:
- **CodeDeployDefault.OneAtATime**: For critical services
- **CodeDeployDefault.HalfAtATime**: For scalable services
- **CodeDeployDefault.AllAtOnce**: For non-critical services

---

## Disaster Recovery

### Backup Strategy
**RPO (Recovery Point Objective)**: 5 minutes
**RTO (Recovery Time Objective)**: 1 hour

#### Database Backups
- **Automated Backups**: Daily at 2 AM UTC
- **Transaction Logs**: Every 5 minutes
- **Manual Backups**: Before major changes
- **Cross-Region Replication**: To us-west-2

#### S3 Replication
- **Cross-Region Replication**: Enabled for critical buckets
- **Versioning**: Enabled for all buckets
- **Lifecycle Rules**: Automated transition to Glacier

### Recovery Procedures
1. **Database Failover**: Automatic (<30 seconds)
2. **Instance Recovery**: Auto-scaling replacement (<5 minutes)
3. **Region Failover**: Manual (30-60 minutes)
4. **Data Restore**: From backups (30-60 minutes)

### DR Testing
- **Monthly**: Database failover test
- **Quarterly**: Full DR drill
- **Annually**: Region failover test

---

## Cost Optimization

### Cost Saving Measures

#### Reserved Instances
- **Frontend**: 20% of baseline capacity (1-year term)
- **Backend**: 20% of baseline capacity (1-year term)
- **GPU**: 10% of baseline capacity (1-year term)

#### Spot Instances
- **GPU Instances**: 80% of scaling capacity
- **Savings**: Up to 70% compared to on-demand

#### Auto-scaling
- **Scale down during off-peak hours**
- **Scale up during peak hours**
- **Right-sizing instances based on usage**

#### S3 Lifecycle
- **Transition to IA**: After 30 days
- **Transition to Glacier**: After 90 days
- **Expiration**: After 365 days

### Cost Monitoring
- **Budgets**: Monthly budget alerts
- **Cost Explorer**: Analyze spending patterns
- **Trusted Advisor**: Optimization recommendations
- **Anomaly Detection**: Unusual spending alerts

---

## Infrastructure as Code

### Terraform
**State Storage**: S3 bucket with DynamoDB locking
**Modules**:
- **network**: VPC, subnets, security groups
- **compute**: EC2, Auto Scaling Groups
- **database**: RDS, ElastiCache
- **storage**: S3 buckets, EBS volumes
- **load-balancing**: ALB, NLB
- **monitoring**: CloudWatch, alarms

### Configuration Management
- **Ansible**: Server configuration
- **Systems Manager**: Parameter store
- **CloudFormation**: Stack management

---

## High Availability Architecture

### Multi-AZ Deployment
- **Compute**: Distributed across 2 AZs
- **Database**: Multi-AZ with automatic failover
- **Storage**: Cross-AZ replication

### Health Checks
- **ALB Health Checks**: HTTP 200 OK
- **Auto-scaling Health Checks**: EC2 status
- **RDS Health Checks**: Database connectivity
- **ElastiCache Health Checks**: Redis connectivity

### Failover Mechanisms
- **Database**: Automatic failover (<30 seconds)
- **Load Balancer**: Cross-zone load balancing
- **DNS**: Route 53 health-based routing

---

## Performance Optimization

### Networking
- **Enhanced Networking**: Enabled on supported instances
- **Placement Groups**: Cluster for GPU instances
- **EBS-Optimized**: Enabled on all instances

### Compute
- **Instance Types**: Right-sized for workloads
- **Auto-scaling**: Based on CPU and custom metrics
- **Spot Instances**: For fault-tolerant workloads

### Storage
- **EBS Types**: Optimized for workload (gp3, io2)
- **EFS**: For shared file access
- **S3**: For object storage with CDN

---

## Compliance and Governance

### AWS Config
- **Rules**: Compliance rules enforced
- **Notifications**: SNS for rule violations
- **Remediation**: Automatic remediation where possible

### AWS Control Tower
- **Landing Zone**: Multi-account setup
- **Guardrails**: Preventive and detective
- **Account Factory**: Automated account creation

### Audit Trail
- **CloudTrail**: Enabled for all regions
- **S3 Storage**: Trail logs to S3
- **Log File Validation**: Enabled
- **Encryption**: Enabled

---

## Future Infrastructure Enhancements

### Planned Improvements

#### Edge Computing
- **AWS Wavelength**: For 5G edge computing
- **Local Zones**: For low-latency requirements
- **Expected**: <50ms transformation latency

#### Serverless Architecture
- **AWS Lambda**: For event-driven tasks
- **Fargate**: For containerized workloads
- **Expected**: Reduced operational overhead

#### Machine Learning Infrastructure
- **SageMaker**: For model training and deployment
- **Inference Optimizer**: For cost optimization
- **Expected**: Better model performance

---

## Infrastructure Metrics

### Key Performance Indicators
- **Uptime**: 99.9% SLA
- **Latency**: <100ms face, <200ms voice
- **Throughput**: 10,000+ concurrent users
- **Scalability**: Auto-scale to 100 GPU instances

### Cost Targets
- **Monthly Infrastructure**: $3,100 - $7,600
- **Per User Cost**: <$0.50 per month
- **GPU Cost**: <$0.10 per minute
- **Storage Cost**: <$0.02 per GB

---

## Support and Maintenance

### Maintenance Windows
- **OS Patching**: Sunday 2:00-4:00 AM UTC
- **Database Maintenance**: Sunday 3:00-4:00 AM UTC
- **Infrastructure Updates**: Sunday 4:00-6:00 AM UTC

### Support Tiers
- **Level 1**: AWS Business Support
- **Level 2**: AWS Enterprise Support (future)
- **Level 3**: TAM (Technical Account Manager) (future)

---

*This infrastructure documentation will be updated as the platform evolves and requirements change.*