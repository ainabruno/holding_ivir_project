# Holding IVIR - Legal Intelligence Platform

A full-stack legal intelligence platform that automatically scrapes legal sources, enriches results with AI-powered entity extraction, stores everything in a relational database, and surfaces it through a clean web dashboard with admin controls.

## Architecture Overview

The platform is built with a modular architecture consisting of four core modules plus a React interface:

- **Module Alpha (Web Scraping)**: Collects legal documents from various sources with deduplication and retry logic
- **Module Beta (AI/NLP Extraction)**: Extracts structured legal entities using Mistral AI with Pydantic validation
- **Module Gamma (Database)**: Stores raw documents and enriched entities in MySQL/PostgreSQL
- **Module Delta (API)**: Provides typed tRPC procedures for data access and admin operations
- **Module Interface (React Dashboard)**: Displays documents, statistics, and admin controls

## Technology Stack

- **Backend**: Node.js + Express + tRPC + TypeScript
- **Frontend**: React 19 + Tailwind CSS 4 + Recharts
- **Database**: MySQL/PostgreSQL with Drizzle ORM
- **AI/LLM**: Mistral AI (mistral-small-latest)
- **Scraping**: Python 3.11+ with BeautifulSoup + Requests
- **Deployment**: Docker + Docker Compose

## Project Structure

```
holding_ivir_project/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # Main dashboard with tables and charts
│   │   │   ├── Home.tsx       # Landing page
│   │   │   └── NotFound.tsx
│   │   ├── components/        # Reusable UI components
│   │   ├── lib/trpc.ts        # tRPC client setup
│   │   └── App.tsx            # Router configuration
│   └── index.html
├── server/                    # Express backend
│   ├── routers/
│   │   └── legal.ts           # Module Delta: tRPC procedures
│   ├── db.ts                  # Module Gamma: Database helpers
│   ├── routers.ts             # Main router configuration
│   └── _core/                 # Framework internals
├── modules/                   # Python modules
│   ├── alpha_scraping.py      # Module Alpha: Web scraping
│   └── beta_extraction.py     # Module Beta: AI extraction
├── drizzle/                   # Database schema and migrations
│   ├── schema.ts              # Table definitions
│   └── migrations/            # SQL migration files
├── docker-compose.yml         # Local development setup
├── Dockerfile                 # Production container
├── .env.example               # Environment variables template
└── package.json               # Node.js dependencies
```

## Setup Instructions

### Prerequisites

- Node.js 22.x or higher
- Python 3.11+
- MySQL 8.0+ or PostgreSQL 14+
- Docker & Docker Compose (optional, for containerized setup)

### Local Development Setup

1. **Clone and install dependencies**:
   ```bash
   cd holding_ivir_project
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   # Database
   DATABASE_URL="mysql://user:password@localhost:3306/holding_ivir"
   
   # Mistral AI
   MISTRAL_API_KEY="your_mistral_api_key"
   
   # OAuth (Manus)
   VITE_APP_ID="your_app_id"
   OAUTH_SERVER_URL="https://api.manus.im"
   VITE_OAUTH_PORTAL_URL="https://portal.manus.im"
   
   # JWT
   JWT_SECRET="your_jwt_secret_key"
   ```

3. **Setup database**:
   ```bash
   # Generate migrations
   pnpm drizzle-kit generate
   
   # Apply migrations
   pnpm drizzle-kit migrate
   ```

4. **Start development server**:
   ```bash
   pnpm dev
   ```
   
   The application will be available at `http://localhost:3000`

5. **Install Python dependencies** (for scraping/extraction):
   ```bash
   pip install -r modules/requirements.txt
   ```

### Docker Setup

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

2. **Access the application**:
   - Frontend: `http://localhost:3000`
   - API: `http://localhost:3000/api/trpc`

## Module Usage

### Module Alpha: Web Scraping

Run the scraping module to collect legal documents:

```bash
python modules/alpha_scraping.py
```

Output is saved to `output/raw_data.json` with the following structure:
```json
{
  "id_source": "unique_hash",
  "source": "wikipedia",
  "texte_brut": "raw document text",
  "url_source": "https://...",
  "date_collecte": "2026-08-10T08:00:00",
  "niveau_confiance_extraction": null
}
```

### Module Beta: AI Extraction

Extract legal entities from scraped documents:

```bash
python modules/beta_extraction.py
```

Output includes:
- `type_litige`: Type of legal dispute
- `sens_verdict`: "favorable", "rejected", or "partial"
- `montant_alloue`: Awarded amount
- `niveau_confiance`: Confidence score (0.0-1.0)
- `references_legales`: Legal references cited

### Module Delta: tRPC API

Available endpoints (all prefixed with `/api/trpc`):

**Admin-only procedures** (require authentication + admin role):
- `legal.triggerScraping`: Start a scraping job
- `legal.triggerExtraction`: Start an extraction job

**Public procedures** (read-only):
- `legal.listDocuments`: Get paginated documents
- `legal.filterDocumentsByDate`: Filter by date range
- `legal.filterDocumentsBySource`: Filter by source
- `legal.getEntitiesByDocument`: Get enriched entities for a document
- `legal.filterEntitiesByVerdict`: Filter by verdict type
- `legal.filterEntitiesByJurisdiction`: Filter by jurisdiction
- `legal.getStatistics`: Get dashboard statistics

### Module Interface: React Dashboard

Access the dashboard at `/dashboard`:
- View collected documents in a searchable table
- See verdict distribution and top jurisdictions charts
- Monitor confidence scores and extraction status
- Admin users can trigger scraping and extraction jobs

## Database Schema

### legal_documents
Stores raw scraped documents:
- `id_source`: Unique identifier
- `source`: Source name (wikipedia, legifrance, etc.)
- `texte_brut`: Raw text content
- `url_source`: Source URL
- `date_collecte`: Collection timestamp
- `niveau_confiance_extraction`: Confidence level (0-100)

### legal_entities
Stores enriched entities extracted by AI:
- `id_decision`: Unique entity identifier
- `source_id`: Reference to legal_documents
- `type_litige`: Type of dispute
- `sens_verdict`: Verdict outcome
- `montant_alloue`: Awarded amount
- `niveau_confiance`: AI confidence (0-100)
- `resume_automatique`: Auto-generated summary

### scraping_jobs & extraction_jobs
Track job execution history for monitoring and debugging.

## Testing

Run the test suite:

```bash
pnpm test
```

Tests cover:
- Database operations
- tRPC procedures
- React components
- Scraping and extraction logic

## Deployment

### Production Build

```bash
pnpm build
pnpm start
```

### Docker Deployment

```bash
docker build -t holding-ivir .
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e MISTRAL_API_KEY="..." \
  holding-ivir
```

### Environment Variables for Production

```env
NODE_ENV=production
DATABASE_URL=mysql://user:pass@host:3306/db
MISTRAL_API_KEY=sk-...
JWT_SECRET=your-secret-key
VITE_APP_ID=app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

## API Documentation

The API is automatically documented via tRPC's type-safe procedures. Access the interactive API explorer at `/api/trpc` when the server is running.

## Features

- ✅ Automated legal document scraping with deduplication
- ✅ AI-powered entity extraction using Mistral LLM
- ✅ Structured data storage with Drizzle ORM
- ✅ Type-safe API with tRPC
- ✅ React dashboard with charts and tables
- ✅ Admin authentication and role-based access control
- ✅ Confidence scoring for all extractions
- ✅ Pagination and filtering capabilities
- ✅ Comprehensive statistics and KPIs
- ✅ Docker-ready deployment

## Future Enhancements

- Légifrance API integration for official legal sources
- Semantic search with pgvector
- Advanced filtering and full-text search
- Email notifications for new documents
- User annotations and feedback system
- Export to PDF/Excel
- Multi-language support
- Real-time job status updates via WebSocket

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the development team.

## Acknowledgments

- Mistral AI for LLM capabilities
- Drizzle ORM for database management
- tRPC for type-safe APIs
- React and Tailwind CSS for the frontend
