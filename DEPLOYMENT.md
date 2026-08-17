# Holding IVIR - Deployment Guide

This guide covers deploying the Holding IVIR Legal Intelligence Platform to production.

## Prerequisites

- Docker & Docker Compose installed
- MySQL 8.0+ or PostgreSQL 14+ (if not using Docker)
- Node.js 22.x (for local development)
- Python 3.11+ (for running scraping/extraction modules)
- Mistral AI API key
- Manus OAuth credentials

## Quick Start with Docker Compose

### 1. Clone the Repository

```bash
git clone <repository-url>
cd holding_ivir_project
```

### 2. Configure Environment Variables

```bash
cp ENVIRONMENT.template .env
```

Edit `.env` with your configuration. The repository includes `ENVIRONMENT.template`; replace every placeholder and do not commit `.env`:

```env
# Database
DATABASE_URL="mysql://holding_user:holding_password@mysql:3306/holding_ivir"

# Mistral AI
MISTRAL_API_KEY="your_mistral_api_key"

# OAuth
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# JWT
JWT_SECRET="your_jwt_secret_key"

# Owner
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your_open_id"

# Manus APIs
BUILT_IN_FORGE_API_KEY="your_forge_api_key"
VITE_FRONTEND_FORGE_API_KEY="your_frontend_forge_api_key"

# App Settings
VITE_APP_TITLE="Holding IVIR"
VITE_APP_LOGO="https://your-logo-url.png"
```

### 3. Start Services

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec app pnpm drizzle-kit migrate

# Or manually apply migrations
docker-compose exec mysql mysql -u holding_user -pholding_password holding_ivir < drizzle/migrations/0001_*.sql
```

### 5. Access the Application

- Frontend: http://localhost:3000
- API: http://localhost:3000/api/trpc
- Dashboard: http://localhost:3000/dashboard
- Admin Panel: http://localhost:3000/admin

## Production Deployment

### Option 1: Docker on Cloud Run (Google Cloud)

```bash
# Build image
docker build -t gcr.io/your-project/holding-ivir .

# Push to Google Container Registry
docker push gcr.io/your-project/holding-ivir

# Deploy to Cloud Run
gcloud run deploy holding-ivir \
  --image gcr.io/your-project/holding-ivir \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL="mysql://...",MISTRAL_API_KEY="..." \
  --memory 512Mi \
  --timeout 180
```

### Option 2: Docker on AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t holding-ivir .
docker tag holding-ivir:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/holding-ivir:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/holding-ivir:latest

# Deploy via ECS (configure task definition and service)
```

### Option 3: Traditional VPS (Ubuntu 22.04)

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y docker.io docker-compose nodejs npm

# Clone repository
git clone <repository-url>
cd holding_ivir_project

# Configure environment
cp ENVIRONMENT.template .env
nano .env

# Start services
docker-compose up -d

# Setup SSL with Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d your-domain.com
```

## Environment Variables for Production

```env
# Required
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:3306/holding_ivir
MISTRAL_API_KEY=sk-...
JWT_SECRET=your-very-secure-random-key

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Owner
OWNER_NAME=Administrator
OWNER_OPEN_ID=your_open_id

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_key

# App
VITE_APP_TITLE=Holding IVIR - Legal Intelligence
VITE_APP_LOGO=https://your-domain.com/logo.png

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# Server
PORT=3000
```

## Database Setup

### MySQL

```bash
# Create database and user
mysql -u root -p
CREATE DATABASE holding_ivir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'holding_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON holding_ivir.* TO 'holding_user'@'%';
FLUSH PRIVILEGES;

# Run migrations
mysql -u holding_user -p holding_ivir < drizzle/migrations/0001_*.sql
```

### PostgreSQL

```bash
# Create database and user
psql -U postgres
CREATE DATABASE holding_ivir;
CREATE USER holding_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE holding_ivir TO holding_user;

# Update DATABASE_URL
DATABASE_URL="postgresql://holding_user:secure_password@localhost:5432/holding_ivir"
```

## Running Scraping and Extraction Jobs

### Manual Execution

```bash
# Run scraping
python modules/alpha_scraping.py

# Run extraction
python modules/beta_extraction.py
```

### Via Docker

```bash
# Run scraping in container
docker-compose exec python_runner python modules/alpha_scraping.py

# Run extraction in container
docker-compose exec python_runner python modules/beta_extraction.py
```

### Via Admin Panel

1. Navigate to http://your-domain.com/admin
2. Authenticate as admin user
3. Select source and click "Start Scraping"
4. Click "Start Extraction" to process documents

## Monitoring and Logging

### View Application Logs

```bash
# Docker Compose
docker-compose logs -f app

# Docker
docker logs -f holding_ivir_app

# Kubernetes
kubectl logs -f deployment/holding-ivir
```

### Database Backups

```bash
# MySQL backup
mysqldump -u holding_user -p holding_ivir > backup_$(date +%Y%m%d).sql

# PostgreSQL backup
pg_dump -U holding_user holding_ivir > backup_$(date +%Y%m%d).sql

# Restore
mysql -u holding_user -p holding_ivir < backup_20260810.sql
```

## Performance Optimization

### Database Indexes

The schema includes indexes on frequently queried fields. For large datasets, consider adding additional indexes:

```sql
CREATE INDEX idx_legal_entities_verdict ON legal_entities(sens_verdict);
CREATE INDEX idx_legal_entities_juridiction ON legal_entities(juridiction);
CREATE INDEX idx_legal_documents_source ON legal_documents(source);
CREATE INDEX idx_legal_documents_date ON legal_documents(date_collecte);
```

### Caching

Consider implementing Redis caching for:
- Document listings
- Statistics aggregations
- Entity filters

### Database Connection Pooling

Drizzle ORM automatically handles connection pooling. Adjust pool size in production:

```typescript
// server/db.ts
const pool = mysql.createPool({
  connectionLimit: 10,
  // ... other options
});
```

## Security Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS/SSL
- [ ] Set strong JWT_SECRET
- [ ] Restrict database access to application only
- [ ] Enable database encryption at rest
- [ ] Implement rate limiting on API endpoints
- [ ] Enable CORS properly
- [ ] Use environment variables for all secrets
- [ ] Implement audit logging
- [ ] Regular security updates for dependencies

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
mysql -u holding_user -p -h localhost holding_ivir -e "SELECT 1"

# Check connection string format
echo $DATABASE_URL
```

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Verify environment variables
docker-compose exec app env | grep DATABASE_URL

# Check database migrations
docker-compose exec app pnpm drizzle-kit migrate
```

### High Memory Usage

```bash
# Check Node.js heap
docker stats holding_ivir_app

# Increase memory limit in docker-compose.yml
# Add: mem_limit: 1g
```

## Support

For issues or questions, refer to the main README.md or contact the development team.
