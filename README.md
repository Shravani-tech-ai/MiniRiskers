# MiniRiskers

## AI-Assisted Financial Crime Risk Assessment Workbench

MiniRiskers is a hackathon project for automating and improving financial crime risk assessments for new banking products and changes in the Indian banking context.

The system is designed to help FCRM analysts assess risks using regulatory evidence, structured product information, configurable risk scoring, and AI-assisted analysis while keeping the final decision with human reviewers.

---

## Progress — September 4, 2026

### Completed Today

- Set up the MiniRiskers project structure.
- Created Python virtual environment and installed required dependencies.
- Added Indian banking regulatory documents under `documents/`.
- Built PDF document processing pipeline using PyMuPDF.
- Extracted text from 9 regulatory documents and stored processed text under `data/processed/`.
- Built regulatory vector store using:
  - ChromaDB
  - Hugging Face `all-MiniLM-L6-v2` embeddings
- Added regulatory document metadata including:
  - Authority
  - Document type
  - Jurisdiction
  - Status
  - Page number
- Built regulatory query engine.
- Successfully tested regulatory searches and retrieved relevant document sections with source and page information.
- Set up FastAPI backend with SQLAlchemy and SQLite.
- Created initial `ChangeRequest` database model.
- Created and tested the first Change Request API.
- Successfully created test request `CR-2026-001` for a Digital International Remittance Product.

### Current Architecture

```text
Regulatory PDFs
      ↓
PDF Processing
      ↓
Text Extraction
      ↓
Chunking + Embeddings
      ↓
ChromaDB
      ↓
Regulatory Query Engine

Product Owner
      ↓
FastAPI Backend
      ↓
SQLite Database
      ↓
Change Request

## Progress — September 5, 2026

### Completed Today

- Expanded the database schema to support structured financial crime risk assessment data.

- Added database models for:
  - Products
  - Customer Profiles
  - Geographies
  - Transaction Profiles
  - Channels
  - Third-Party Vendors
  - Controls
  - Control Effectiveness
  - Risk Factors
  - Risk Assessments
  - Risk Model Configuration
  - Risk Model Weights
  - Regulatory Sources
  - Regulatory Evidence

- Added APIs for creating and retrieving structured change request information across product, customer, geography, transaction, channel, vendor, control, and risk-factor components.

- Implemented automatic risk-factor generation based on change request characteristics.

- Generated risk factors across multiple financial crime risk categories:
  - Customer Risk
  - Product Risk
  - Geography Risk
  - Transaction Risk
  - Channel Risk
  - Third-Party Risk
  - Fraud Risk

- Implemented configurable risk scoring methodology using weighted risk categories.

- Added inherent risk calculation using category-level risk scores and configurable weights.

- Added risk rating bands:
  - LOW
  - MEDIUM
  - HIGH
  - CRITICAL

- Implemented control effectiveness scoring using:
  - Design Effectiveness
  - Operating Effectiveness
  - Coverage
  - Automation Level
  - Evidence Quality

- Implemented residual risk calculation based on inherent risk and control effectiveness.

- Added risk concentration and risk-floor rules for scenarios such as:
  - Cross-border activity involving high-risk jurisdictions and high transaction velocity
  - Third-party processing without completed vendor due diligence
  - Missing sanctions screening

- Added separation between:
  - System-generated risk assessment
  - AI recommendation
  - Analyst assessment
  - Final human decision

- Added regulatory evidence retrieval using the existing Indian regulatory RAG pipeline.

- Created regulatory query mappings for individual risk factors so that each risk factor can be associated with a relevant Indian regulatory question.

- Implemented automated regulatory evidence generation for all risk factors associated with a Change Request.

- Integrated the regulatory query engine with the FastAPI backend.

- Regulatory evidence now stores:
  - Change Request
  - Risk Factor
  - Regulatory Query
  - Evidence Text
  - Regulatory Authority
  - Document Name
  - Page Number
  - Source Reference
  - Relevance/Distance Score
  - Creation Timestamp

- Added API endpoint to generate regulatory evidence for a Change Request.

- Added API endpoint to retrieve regulatory evidence associated with a Change Request.

- Successfully tested regulatory evidence generation for `CR-2026-001`.

- Successfully generated regulatory evidence for the automatically generated risk factors using the Indian regulatory document collection.

- Fixed SQLAlchemy response serialization so regulatory evidence is returned as structured JSON instead of raw ORM objects.

- Fixed risk-factor generation issues related to transaction velocity data types.

- Fixed the regulatory evidence generation variable-name error and verified successful evidence generation.

- Added project-level ChromaDB path handling so the vector store can be accessed reliably from the project structure.

- Improved the regulatory query engine by caching the embedding/vector-store instance to avoid repeatedly loading the Hugging Face embedding model for every query.

### Current Risk Assessment Flow

```text
Change Request
      ↓
Structured Product / Customer / Geography / Transaction Data
      ↓
Automatic Risk Factor Generation
      ↓
Risk Category Scoring
      ↓
Inherent Risk Calculation
      ↓
Control Effectiveness Assessment
      ↓
Residual Risk Calculation
      ↓
Regulatory Evidence Retrieval
      ↓
Risk Assessment + Regulatory Evidence
      ↓
AI-Assisted FCRM Assessment
      ↓
Human Analyst Review
      ↓
Risk Committee Decision

---

## Authentication (local development)

The API uses JWT bearer tokens. On first startup, if the `users` table is empty, development accounts are seeded automatically.

| Username | Role | Default password (dev only) |
|----------|------|-----------------------------|
| `business_owner` | BUSINESS_OWNER | `dev-business-owner` |
| `risk_analyst` | RISK_ANALYST | `dev-risk-analyst` |
| `risk_committee` | RISK_COMMITTEE | `dev-risk-committee` |
| `auditor` | AUDITOR | `dev-auditor` |
| `admin` | ADMIN | `dev-admin` |

1. Copy `.env.example` to `.env` and set `JWT_SECRET` for non-local use.
2. Install backend dependencies: `pip install -r requirements.txt`
3. Start API: `uvicorn backend.main:app --reload`
4. Start frontend: `cd frontend && npm run dev`
5. Open `http://localhost:5173/` (landing page) → **Create account** or **Sign in**
6. After login you are redirected to `/dashboard` with role-based access

**Self-registration:** `POST /auth/register` with username, email, password, full_name, and role (`BUSINESS_OWNER`, `RISK_ANALYST`, `RISK_COMMITTEE`, `AUDITOR`). Admin self-signup is disabled by default (`ALLOW_ADMIN_SELF_SIGNUP=false`).

Existing change requests and assessment data are preserved. New requests record `requested_by` from the signed-in user (`full_name`).