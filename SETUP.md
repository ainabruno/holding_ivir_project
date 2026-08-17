# Holding IVIR - Setup Guide

Complete setup instructions for the Holding IVIR Legal Intelligence Platform.

## Required Environment Variables

Before starting the application, you need to configure the following environment variables. Create a `.env` file in the project root with these values:

### Database Configuration
```
DATABASE_URL=mysql://holding_user:holding_password@localhost:3306/holding_ivir
```

### Mistral AI Configuration (Required for Module Beta)
```
MISTRAL_API_KEY=your_mistral_api_key_here
```

Get your API key from: https://console.mistral.ai/

### JWT Configuration
```
JWT_SECRET=your-very-secure-random-key-change-this-in-production
```

### Manus OAuth Configuration
```
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

### Owner Information
```
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
```

### Manus Built-in APIs
```
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key
```

### Application Settings
```
VITE_APP_TITLE=Holding IVIR - Legal Intelligence Platform
VITE_APP_LOGO=https://your-logo-url.png
```

### Optional Analytics
```
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id
```

## Local Development Setup

### Step 1: Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies (for scraping/extraction modules)
pip install -r modules/requirements.txt
```

### Step 2: Configure Environment

```bash
# Create .env file with your configuration
cp .env.example .env

# Edit .env with your actual values
nano .env
```

### Step 3: Setup Database

```bash
# Generate database migrations
pnpm drizzle-kit generate

# Apply migrations to your database
pnpm drizzle-kit migrate
```

### Step 4: Start Development Server

```bash
# Start the dev server (includes hot reload)
pnpm dev
```

The application will be available at `http://localhost:3000`

## Docker Setup (Recommended for Production)

### Step 1: Configure Environment

```bash
cp .env.example .env
nano .env
```

### Step 2: Start Services

```bash
# Build and start all services (MySQL + Node.js app)
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### Step 3: Initialize Database

```bash
# Apply migrations
docker-compose exec app pnpm drizzle-kit migrate
```

### Step 4: Access Application

- Frontend: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Admin Panel: http://localhost:3000/admin (requires admin login)

## Obtaining Required Credentials

### Mistral AI API Key

1. Visit https://console.mistral.ai/
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add to `.env` as `MISTRAL_API_KEY`

### Manus OAuth Credentials

1. Register your application at https://manus.im
2. Get your `VITE_APP_ID`
3. Configure redirect URI to `http://localhost:3000/api/oauth/callback`
4. Add credentials to `.env`

## Verifying Setup

### Test Database Connection

```bash
# Check if database is accessible
mysql -u holding_user -p -h localhost holding_ivir -e "SELECT 1"

# Or with Docker
docker-compose exec mysql mysql -u holding_user -pholding_password holding_ivir -e "SELECT 1"
```

### Test Mistral AI Integration

```bash
# Run the extraction module with a sample text
python modules/beta_extraction.py
```

### Test Application

1. Open http://localhost:3000 in your browser
2. You should see the Holding IVIR homepage
3. Navigate to /dashboard to view the dashboard
4. Try logging in to access admin features

## Troubleshooting

### "Database connection refused"

**Problem**: Cannot connect to MySQL database

**Solution**:
```bash
# Check if MySQL is running
docker-compose ps

# Restart MySQL
docker-compose restart mysql

# Check connection string in .env
echo $DATABASE_URL
```

### "MISTRAL_API_KEY not found"

**Problem**: AI extraction module fails

**Solution**:
1. Verify `MISTRAL_API_KEY` is set in `.env`
2. Check the key is valid at https://console.mistral.ai/
3. Restart the application after adding the key

### "Port 3000 already in use"

**Problem**: Another service is using port 3000

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

### "OAuth callback fails"

**Problem**: Login redirects to error page

**Solution**:
1. Verify `VITE_APP_ID` is correct
2. Check redirect URI is set to `http://localhost:3000/api/oauth/callback`
3. Ensure `OAUTH_SERVER_URL` is correct

## Running Scraping and Extraction

### Manual Execution

```bash
# Scrape legal documents
python modules/alpha_scraping.py

# Extract entities from documents
python modules/beta_extraction.py
```

### Via Admin Panel

1. Navigate to http://localhost:3000/admin
2. Login with admin account
3. Select source and click "Start Scraping"
4. After documents are collected, click "Start Extraction"

### Via Docker

```bash
# Run scraping in container
docker-compose exec python_runner python modules/alpha_scraping.py

# Run extraction in container
docker-compose exec python_runner python modules/beta_extraction.py
```

## Next Steps

1. **Configure Admin User**: Promote a user to admin role in the database
2. **Run Scraping Job**: Collect legal documents from sources
3. **Run Extraction Job**: Extract legal entities using AI
4. **Monitor Dashboard**: View collected documents and statistics
5. **Deploy to Production**: Follow DEPLOYMENT.md for production setup

## Support

For additional help, refer to:
- README_HOLDING_IVIR.md - Project overview and architecture
- DEPLOYMENT.md - Production deployment guide
- GitHub Issues - Report bugs or request features
