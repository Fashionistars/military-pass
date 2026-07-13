# Military Pass - Technology Stack & Dependencies

## Overview

This document provides a comprehensive overview of the technology stack, dependencies, libraries, and tools required to build and deploy the Military Pass platform. The stack is organized by layer and includes specific versions, installation commands, and configuration details.

---

## Frontend Technology Stack

### Core Framework
- **Next.js 14.1.0** - React framework with App Router
  ```bash
  npm install next@14.1.0 react@18.2.0 react-dom@18.2.0
  ```

- **React 18.2.0** - UI library
- **TypeScript 5.3.3** - Type-safe JavaScript
  ```bash
  npm install -D typescript@5.3.3 @types/react@18.2.0 @types/node@20.11.0
  ```

### Styling & UI Components
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
  ```bash
  npm install -D tailwindcss@3.4.1 postcss@8.4.35 autoprefixer@10.4.17
  ```

- **shadcn/ui** - Reusable component library
  ```bash
  npx shadcn-ui@latest init
  ```

- **Radix UI** - Headless UI components
  ```bash
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
  ```

- **Lucide React** - Icon library
  ```bash
  npm install lucide-react@0.316.0
  ```

### State Management
- **Zustand 4.5.0** - Lightweight state management
  ```bash
  npm install zustand@4.5.0
  ```

- **React Query 5.17.9** - Server state management
  ```bash
  npm install @tanstack/react-query@5.17.9
  ```

### Real-time Communication
- **Socket.io Client 4.6.1** - WebSocket client
  ```bash
  npm install socket.io-client@4.6.1
  ```

- **WebRTC** - Real-time communication
  ```bash
  npm install simple-peer@9.11.1
  ```

### Video & Audio Processing
- **MediaPipe 0.4.1673529056** - Face and hand tracking
  ```bash
  npm install @mediapipe/face_detection @mediapipe/face_mesh @mediapipe/hands
  ```

- **Three.js 0.160.0** - 3D graphics for VTuber mode
  ```bash
  npm install three@0.160.0 @react-three/fiber@8.15.12 @react-three/drei@9.96.1
  ```

- **FFmpeg.wasm 0.12.7** - Video processing in browser
  ```bash
  npm install @ffmpeg/ffmpeg@0.12.7 @ffmpeg/util@0.12.1
  ```

### Forms & Validation
- **React Hook Form 7.49.3** - Form management
  ```bash
  npm install react-hook-form@7.49.3
  ```

- **Zod 3.22.4** - Schema validation
  ```bash
  npm install zod@3.22.4 @hookform/resolvers@3.3.4
  ```

### Utilities
- **Date-fns 3.3.1** - Date manipulation
  ```bash
  npm install date-fns@3.3.1
  ```

- **clsx 2.1.0** - Conditional class names
  ```bash
  npm install clsx@2.1.0 tailwind-merge@2.2.1
  ```

- **Axios 1.6.5** - HTTP client
  ```bash
  npm install axios@1.6.5
  ```

### Development Tools
- **ESLint 8.56.0** - Linting
  ```bash
  npm install -D eslint@8.56.0 eslint-config-next@14.1.0
  ```

- **Prettier 3.2.4** - Code formatting
  ```bash
  npm install -D prettier@3.2.4 eslint-config-prettier@9.1.0
  ```

- **Playwright 1.41.0** - E2E testing
  ```bash
  npm install -D @playwright/test@1.41.0
  ```

---

## Backend Technology Stack

### Core Framework
- **Next.js API Routes** - Serverless API endpoints
- **FastAPI 0.109.0** - Python web framework
  ```bash
  pip install fastapi==0.109.0 uvicorn[standard]==0.27.0
  ```

- **Python 3.11** - Programming language
  ```bash
  # Use pyenv or conda for Python version management
  pyenv install 3.11.7
  pyenv local 3.11.7
  ```

### Authentication & Authorization
- **NextAuth.js 4.24.5** - Authentication for Next.js
  ```bash
  npm install next-auth@4.24.5
  ```

- **JWT** - JSON Web Tokens
  ```bash
  npm install jsonwebtoken@9.0.2
  pip install PyJWT==2.8.0
  ```

- **OAuth2** - OAuth 2.0 support
  ```bash
  pip install authlib==1.3.0
  ```

### Database
- **PostgreSQL 15** - Primary database
  ```bash
  # Local development with Docker
  docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
  
  # Production: Neon Serverless Postgres
  pip install psycopg2-binary==2.9.9
  ```

- **Prisma 5.9.1** - ORM for TypeScript
  ```bash
  npm install prisma@5.9.1 -D
  npx prisma init
  ```

- **SQLAlchemy 2.0.25** - ORM for Python
  ```bash
  pip install sqlalchemy==2.0.25 alembic==1.13.1
  ```

### Caching & Session Management
- **Redis 7.2** - In-memory data store
  ```bash
  # Local development with Docker
  docker run --name redis -p 6379:6379 -d redis:7.2-alpine
  
  # Python client
  pip install redis==5.0.1
  
  # Node.js client
  npm install redis@4.6.12
  ```

### Message Queue
- **RabbitMQ 3.12** - Message broker
  ```bash
  # Local development with Docker
  docker run --name rabbitmq -p 5672:5672 -p 15672:15672 -d rabbitmq:3.12-management
  
  # Python client
  pip install pika==1.3.2
  
  # Node.js client
  npm install amqplib@0.10.3
  ```

### Real-time Communication
- **Socket.io 4.6.1** - WebSocket server
  ```bash
  npm install socket.io@4.6.1
  pip install python-socketio==5.11.0
  ```

- **aiohttp 3.9.1** - Async HTTP client/server
  ```bash
  pip install aiohttp==3.9.1 aiohttp-cors==0.7.0
  ```

### File Storage
- **AWS S3** - Object storage
  ```bash
  pip install boto3==1.34.23
  npm install @aws-sdk/client-s3@3.470.0
  ```

- **CloudFront** - CDN distribution
  ```bash
  pip install boto3==1.34.23
  ```

### API Documentation
- **Swagger/OpenAPI** - API documentation
  ```bash
  pip install pydantic==2.5.3
  # FastAPI includes automatic Swagger UI
  ```

---

## AI/ML Technology Stack

### Deep Learning Frameworks
- **PyTorch 2.1.2** - Deep learning framework
  ```bash
  pip install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cu121
  ```

- **TensorFlow 2.15.0** - Alternative deep learning framework
  ```bash
  pip install tensorflow==2.15.0
  ```

### Face Processing
- **InsightFace 0.7.3** - Face detection and swapping
  ```bash
  pip install insightface==0.7.3 onnxruntime-gpu==1.16.3
  ```

- **RetinaFace** - Face detection
  ```bash
  pip install retina-face-pytorch==0.0.7
  ```

- **GFPGAN 1.3.8** - Face restoration and enhancement
  ```bash
  pip install gfpgan==1.3.8 basicsr==1.4.2
  ```

- **CodeFormer 0.1.0** - Face enhancement alternative
  ```bash
  pip install realesrgan==0.3.1
  ```

### Voice Processing
- **RVC (Retrieval-based Voice Conversion)** - Voice cloning
  ```bash
  git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
  cd Retrieval-based-Voice-Conversion-WebUI
  pip install -r requirements.txt
  ```

- **Coqui TTS 0.22.0** - Text-to-speech
  ```bash
  pip install TTS==0.22.0
  ```

- **ElevenLabs API** - Commercial voice synthesis
  ```bash
  pip install elevenlabs==0.2.26
  ```

- **librosa 0.10.1** - Audio processing
  ```bash
  pip install librosa==0.10.1 soundfile==0.12.1
  ```

- **RNNoise** - Noise reduction
  ```bash
  pip install noise-reduction==0.1.1
  ```

### Model Optimization
- **TensorRT 8.6.1** - GPU acceleration
  ```bash
  # Requires NVIDIA GPU and CUDA
  pip install tensorrt==8.6.1
  ```

- **ONNX Runtime 1.16.3** - Cross-platform inference
  ```bash
  pip install onnxruntime-gpu==1.16.3
  ```

- **OpenVINO 2023.3.0** - Intel optimization
  ```bash
  pip install openvino==2023.3.0
  ```

### Computer Vision
- **OpenCV 4.9.0** - Computer vision library
  ```bash
  pip install opencv-python==4.9.0.80
  ```

- **albumentations 1.4.0** - Image augmentation
  ```bash
  pip install albumentations==1.4.0
  ```

- **Pillow 10.2.0** - Image processing
  ```bash
  pip install Pillow==10.2.0
  ```

### ML Utilities
- **scikit-learn 1.4.0** - Machine learning utilities
  ```bash
  pip install scikit-learn==1.4.0
  ```

- **NumPy 1.26.3** - Numerical computing
  ```bash
  pip install numpy==1.26.3
  ```

- **pandas 2.2.0** - Data manipulation
  ```bash
  pip install pandas==2.2.0
  ```

- **tqdm 4.66.1** - Progress bars
  ```bash
  pip install tqdm==4.66.1
  ```

---

## Infrastructure & DevOps

### Containerization
- **Docker 24.0.7** - Container platform
  ```bash
  # Install from https://docs.docker.com/get-docker/
  ```

- **Docker Compose 2.21.0** - Multi-container orchestration
  ```bash
  # Included with Docker Desktop
  ```

### Container Orchestration
- **Kubernetes 1.29.0** - Container orchestration
  ```bash
  # Install via kubectl
  curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  ```

- **EKS (AWS)** - Managed Kubernetes
  ```bash
  pip install awscli==2.15.1
  aws eks update-kubeconfig --region us-east-1 --name militarypass-cluster
  ```

### CI/CD
- **GitHub Actions** - CI/CD automation
  ```yaml
  # Configuration in .github/workflows/
  ```

- **GitHub CLI** - GitHub command-line tool
  ```bash
  # Install from https://cli.github.com/
  ```

### Cloud Providers
- **AWS CLI 2.15.1** - AWS command-line interface
  ```bash
  pip install awscli==2.15.1
  ```

- **Terraform 1.6.6** - Infrastructure as code
  ```bash
  # Install from https://developer.hashicorp.com/terraform/downloads
  ```

- **Pulumi 3.105.0** - Alternative IaC
  ```bash
  pip install pulumi==3.105.0
  ```

### Monitoring & Logging
- **Prometheus 2.48.0** - Monitoring system
  ```bash
  docker run -p 9090:9090 prom/prometheus
  ```

- **Grafana 10.2.4** - Visualization dashboard
  ```bash
  docker run -p 3000:3000 grafana/grafana
  ```

- **CloudWatch** - AWS monitoring
  ```bash
  pip install boto3==1.34.23
  ```

- **Sentry 1.40.0** - Error tracking
  ```bash
  pip install sentry-sdk==1.40.0
  npm install @sentry/nextjs@7.99.0
  ```

### Load Testing
- **k6 0.49.0** - Load testing tool
  ```bash
  # Install from https://k6.io/docs/getting-started/installation/
  ```

- **Artillery 2.0.6** - Alternative load testing
  ```bash
  npm install -g artillery@2.0.6
  ```

---

## Security & Compliance

### Security Tools
- **Helmet 7.1.0** - Security headers for Express
  ```bash
  npm install helmet@7.1.0
  ```

- **bcrypt 5.1.1** - Password hashing
  ```bash
  npm install bcrypt@5.1.1
  pip install bcrypt==4.1.2
  ```

- **OWASP ZAP** - Security testing
  ```bash
  # Download from https://www.zaproxy.org/download/
  ```

- **Snyk** - Dependency vulnerability scanning
  ```bash
  npm install -g snyk
  pip install snyk
  ```

### Encryption
- **crypto** - Node.js built-in crypto module
- **cryptography 41.0.7** - Python cryptography library
  ```bash
  pip install cryptography==41.0.7
  ```

- **AWS KMS** - Key management service
  ```bash
  pip install boto3==1.34.23
  ```

---

## Development Tools

### Version Control
- **Git 2.43.0** - Version control system
  ```bash
  # Install from https://git-scm.com/downloads
  ```

- **GitHub Desktop** - GUI for Git
  ```bash
  # Install from https://desktop.github.com/
  ```

### Code Editors
- **VS Code** - Recommended IDE
  ```bash
  # Install from https://code.visualstudio.com/
  ```

### API Testing
- **Postman** - API testing tool
  ```bash
  # Install from https://www.postman.com/downloads/
  ```

- **Insomnia** - Alternative API client
  ```bash
  # Install from https://insomnia.rest/download
  ```

### Database Tools
- **DBeaver 23.3** - Database management tool
  ```bash
  # Install from https://dbeaver.io/download/
  ```

- **pgAdmin 4** - PostgreSQL management
  ```bash
  # Install from https://www.pgadmin.org/download/
  ```

---

## Package Management

### Node.js (npm)
```bash
# npm scripts in package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test"
  }
}
```

### Python (pip)
```bash
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
redis==5.0.1
boto3==1.34.23
torch==2.1.2
insightface==0.7.3
```

### Virtual Environments
```bash
# Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## GPU Requirements

### NVIDIA GPU Setup
- **CUDA 12.1** - NVIDIA CUDA toolkit
  ```bash
  # Download from https://developer.nvidia.com/cuda-downloads
  ```

- **cuDNN 8.9** - CUDA Deep Neural Network library
  ```bash
  # Download from https://developer.nvidia.com/cudnn
  ```

- **NVIDIA Drivers 545.29.02** - Latest GPU drivers
  ```bash
  # Download from https://www.nvidia.com/Download/index.aspx
  ```

### GPU Instance Types (AWS)
- **g4dn.xlarge** - 1 GPU, 4 vCPUs, 16 GB RAM
- **g4dn.2xlarge** - 1 GPU, 8 vCPUs, 32 GB RAM
- **g5.xlarge** - 1 GPU, 4 vCPUs, 16 GB RAM
- **g5.2xlarge** - 1 GPU, 8 vCPUs, 32 GB RAM
- **p3.2xlarge** - 1 GPU, 8 vCPUs, 61 GB RAM
- **p3.8xlarge** - 4 GPUs, 32 vCPUs, 244 GB RAM

---

## System Requirements

### Development Machine
- **OS**: Windows 10/11, macOS 12+, Ubuntu 20.04+
- **RAM**: 16 GB minimum, 32 GB recommended
- **Storage**: 500 GB SSD minimum, 1 TB recommended
- **GPU**: NVIDIA RTX 3060 or better (for local ML development)
- **CPU**: Intel i7 or AMD Ryzen 7 or better

### Production Server
- **OS**: Ubuntu 22.04 LTS or Amazon Linux 2023
- **RAM**: 32 GB minimum per GPU instance
- **Storage**: 1 TB NVMe SSD per instance
- **GPU**: NVIDIA A100 or V100 for production
- **Network**: 10 Gbps network interface

---

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://api.militarypass.com
NEXT_PUBLIC_WS_URL=wss://api.militarypass.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/militarypass
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=militarypass-uploads
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG....
```

### AI Service (.env)
```bash
GPU_MEMORY_LIMIT=16GB
MODEL_PATH=/models
BATCH_SIZE=1
MAX_LATENCY_MS=100
ENABLE_TENSORRT=true
```

---

## Installation Commands

### Complete Frontend Setup
```bash
# Clone repository
git clone https://github.com/militarypass/militarypass.git
cd militarypass/frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### Complete Backend Setup
```bash
# Navigate to backend
cd militarypass/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Run development server
uvicorn main:app --reload
```

### Complete AI Service Setup
```bash
# Navigate to AI service
cd militarypass/ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download models
python download_models.py

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Run AI service
python app.py
```

---

## Dependency Management

### Frontend Dependency Updates
```bash
# Check for outdated packages
npm outdated

# Update all packages
npm update

# Update specific package
npm install package-name@latest

# Audit for vulnerabilities
npm audit
npm audit fix
```

### Python Dependency Updates
```bash
# Check for outdated packages
pip list --outdated

# Update specific package
pip install --upgrade package-name

# Update all packages
pip install --upgrade -r requirements.txt

# Check for security vulnerabilities
pip check
```

---

## Troubleshooting

### Common Issues

**1. GPU not detected**
```bash
# Check NVIDIA driver
nvidia-smi

# Check CUDA installation
nvcc --version

# Reinstall PyTorch with CUDA support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**2. Memory errors during model loading**
```bash
# Reduce batch size in .env
BATCH_SIZE=1

# Reduce model precision
# Use FP16 instead of FP32
```

**3. WebSocket connection issues**
```bash
# Check firewall settings
# Ensure WebSocket port is open
# Verify SSL certificate configuration
```

**4. Database connection errors**
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
# Verify credentials in .env
```

---

## Version Pinning Strategy

- **Major versions**: Pin for stability
- **Minor versions**: Allow updates for bug fixes
- **Patch versions**: Always use latest

### Example versions
```json
{
  "dependencies": {
    "next": "14.1.0",
    "react": "^18.2.0",
    "typescript": "~5.3.3"
  }
}
```

---

## License Compliance

### Open Source Licenses
- **MIT License**: Next.js, React, Tailwind CSS
- **Apache 2.0**: PyTorch, TensorFlow
- **GPL 3.0**: Some AI models
- **Commercial**: Some specialized components

### Attribution Requirements
- InsightFace - Academic attribution required
- GFPGAN - Citation in research papers
- RVC - Community attribution

---

## Support & Resources

### Documentation
- Next.js: https://nextjs.org/docs
- FastAPI: https://fastapi.tiangolo.com
- PyTorch: https://pytorch.org/docs
- AWS: https://docs.aws.amazon.com

### Community
- Discord: https://discord.gg/militarypass
- GitHub Issues: https://github.com/militarypass/militarypass/issues
- Stack Overflow: https://stackoverflow.com/questions/tagged/militarypass

---

*This technology stack document will be updated as dependencies evolve and new technologies are adopted.*