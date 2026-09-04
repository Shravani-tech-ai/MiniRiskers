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
