# ADR: MBA Knowledge RAG System

**Status:** Proposed
**Date:** 2026-03-16
**Authors:** ARCHIE (Architecture), VICTOR (Strategy Sponsor)
**Reviewers:** CYRUS (Security), RUTH (Compliance)

---

## Context

The founder is completing a JHU MBA with coursework in Digital Transformation, Strategy, and related disciplines. These academic frameworks have direct operational relevance to Cortex's competitive positioning, partnership strategy, pricing, and product architecture decisions.

Currently, this knowledge exists in:
- PDF readings scattered across `~/Desktop/Education/JHU MBA/`
- DOCX course content in `/prototypes/workforce/personal-assistants/`
- Discussion posts (unstructured text from Canvas LMS)
- Lecture notes and module materials

The Boardroom agents (ARCHIE, VICTOR, GORDON, PAUL, etc.) make strategic recommendations daily but have no systematic access to this accumulated business knowledge. A Phase 1 solution (`.cursor/rules/MBA_FRAMEWORKS.md`) provides five core frameworks as always-on context. This ADR proposes Phase 2: a retrieval-augmented generation system that makes the full corpus searchable and injectable into agent reasoning.

---

## Decision

Build a local-first RAG pipeline using existing infrastructure components:
- **Embeddings:** `nomic-embed-text` via local Ollama (already installed per workspace rules)
- **Storage:** PostgreSQL + pgvector extension (already in ARCHIE's stack)
- **Ingestion:** Python script using `langchain` document loaders
- **Retrieval:** Next.js API route with RBAC guard

No new infrastructure. No external API calls for embeddings. No PHI involved.

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   INGESTION PIPELINE                     │
│                                                          │
│  MBA PDFs ──┐                                            │
│  Course DOCX ──┼──→ scripts/knowledge/ingest_mba.py     │
│  Discussion Posts ─┘        │                             │
│                             │ (chunk + extract metadata)  │
│                             ▼                             │
│                    Local Ollama Server                    │
│                    nomic-embed-text                       │
│                    (768-dim vectors)                      │
│                             │                             │
│                             ▼                             │
│              PostgreSQL + pgvector extension              │
│              Table: knowledge_chunks                      │
│              (Track A extension — NOT shared-kernel)      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   RETRIEVAL LAYER                         │
│                                                          │
│  Boardroom Agent Session                                 │
│       │                                                  │
│       │ strategic question                               │
│       ▼                                                  │
│  GET /api/knowledge/retrieve                             │
│  (RBAC: ADMIN role only — Cyrus enforces)               │
│       │                                                  │
│       │ cosine similarity search                         │
│       ▼                                                  │
│  Top-5 chunks returned with metadata                     │
│  (source, module, date, framework_tag, relevance_score)  │
│       │                                                  │
│       │ injected as context                              │
│       ▼                                                  │
│  Agent response with framework-grounded reasoning        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Ingestion:** Python script reads PDFs (via `PyPDF2` or `pdfplumber`), DOCX (via `python-docx`), and plain text files. Each document is split into chunks of ~512 tokens with 50-token overlap.

2. **Metadata extraction:** Each chunk is tagged with:
   - `source_file`: Original filename
   - `source_type`: `pdf` | `docx` | `discussion_post` | `lecture_note`
   - `module`: Module number (M1–M6) parsed from directory structure or filename
   - `framework_tag`: Primary framework reference (e.g., `porter_heppelmann`, `shapiro_varian`, `aron_singh`, `mcafee_brynjolfsson`, `platform_economics`)
   - `author`: Source author or discussion contributor
   - `date_indexed`: Timestamp of ingestion
   - `course`: Course code (e.g., `BU350620`)

3. **Embedding:** Each chunk is sent to local Ollama (`nomic-embed-text` model, 768 dimensions). Zero cost, zero data exfiltration.

4. **Storage:** Chunks and embeddings are stored in the `knowledge_chunks` table (see schema below).

5. **Retrieval:** A Next.js API route accepts a natural-language query, embeds it using the same model, and performs cosine similarity search against the stored vectors. Returns top-5 matches with metadata.

---

## Database Schema

This is a **Track A extension table** per ARCHIE's invariant AVI-005. It does NOT modify any core table or touch the shared-kernel.

```sql
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content         TEXT NOT NULL,
  embedding       vector(768) NOT NULL,
  source_file     TEXT NOT NULL,
  source_type     TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'discussion_post', 'lecture_note')),
  module          TEXT,                    -- e.g., 'M1', 'M2', 'M3'
  framework_tag   TEXT,                    -- e.g., 'porter_heppelmann'
  author          TEXT,                    -- e.g., 'Porter & Heppelmann' or 'Nico Caprirolo'
  course          TEXT DEFAULT 'BU350620',
  date_indexed    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chunk_index     INTEGER NOT NULL,        -- position within source document
  token_count     INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cosine similarity index for fast retrieval
CREATE INDEX idx_knowledge_chunks_embedding
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Metadata filters
CREATE INDEX idx_knowledge_chunks_framework ON knowledge_chunks(framework_tag);
CREATE INDEX idx_knowledge_chunks_module ON knowledge_chunks(module);
CREATE INDEX idx_knowledge_chunks_source_type ON knowledge_chunks(source_type);
```

### Prisma Model (for migration)

```prisma
model KnowledgeChunk {
  id            String   @id @default(uuid()) @db.Uuid
  content       String   @db.Text
  embedding     Unsupported("vector(768)")
  sourceFile    String   @map("source_file") @db.Text
  sourceType    String   @map("source_type") @db.Text
  module        String?  @db.Text
  frameworkTag  String?  @map("framework_tag") @db.Text
  author        String?  @db.Text
  course        String   @default("BU350620") @db.Text
  dateIndexed   DateTime @default(now()) @map("date_indexed") @db.Timestamptz
  chunkIndex    Int      @map("chunk_index")
  tokenCount    Int?     @map("token_count")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("knowledge_chunks")
}
```

---

## Ingestion Script

**Location:** `scripts/knowledge/ingest_mba.py`

### Dependencies

```
# scripts/knowledge/requirements.txt
langchain>=0.3.0
langchain-community>=0.3.0
langchain-ollama>=0.3.0
pdfplumber>=0.11.0
python-docx>=1.1.0
psycopg2-binary>=2.9.9
pgvector>=0.3.0
tiktoken>=0.8.0
```

### Core Logic (Pseudocode)

```python
"""
MBA Knowledge Ingestion Pipeline
Reads PDFs, DOCX, and text files from MBA course directories.
Chunks, embeds via local Ollama, and stores in PostgreSQL + pgvector.
"""

SOURCES = [
    {
        "path": "~/Desktop/Education/JHU MBA/Digital Transformation of Business/Readings/",
        "source_type": "pdf",
        "course": "BU350620",
    },
    {
        "path": "/prototypes/workforce/personal-assistants/",
        "source_type": "docx",
        "course": "BU350620",
    },
]

CHUNK_SIZE = 512       # tokens
CHUNK_OVERLAP = 50     # tokens
EMBEDDING_MODEL = "nomic-embed-text"
OLLAMA_BASE_URL = "http://localhost:11434"

def ingest():
    for source in SOURCES:
        documents = load_documents(source["path"], source["source_type"])
        for doc in documents:
            chunks = split_into_chunks(doc, CHUNK_SIZE, CHUNK_OVERLAP)
            for i, chunk in enumerate(chunks):
                embedding = embed_via_ollama(chunk.text, EMBEDDING_MODEL)
                metadata = extract_metadata(chunk, source, i)
                store_in_pgvector(chunk.text, embedding, metadata)

def extract_metadata(chunk, source, index):
    """
    Parse module from directory structure or filename.
    Detect framework references via keyword matching.
    """
    framework_tag = detect_framework(chunk.text)  # keyword-based
    module = parse_module_from_path(source["path"])
    return {
        "source_file": chunk.source_file,
        "source_type": source["source_type"],
        "module": module,
        "framework_tag": framework_tag,
        "author": extract_author(chunk),
        "course": source["course"],
        "chunk_index": index,
        "token_count": count_tokens(chunk.text),
    }

FRAMEWORK_KEYWORDS = {
    "porter_heppelmann": ["smart connected", "product cloud", "system of systems", "monitoring control optimization autonomy"],
    "shapiro_varian": ["information rules", "lock-in", "switching costs", "network effects", "versioning", "bundling"],
    "mcafee_brynjolfsson": ["big data", "management revolution", "hippo", "volume velocity variety"],
    "aron_singh": ["offshoring", "outsourcing", "codifiability", "structural risk", "operational risk"],
    "platform_economics": ["two-sided", "marketplace", "platform", "ecosystem", "GAFA"],
}
```

### Running the Script

```bash
# One-time setup
cd scripts/knowledge
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Ensure Ollama is running with the embedding model
ollama pull nomic-embed-text

# Run ingestion
python ingest_mba.py

# After each new MBA module, re-run to index new materials
python ingest_mba.py --incremental
```

---

## Retrieval API

**Location:** `apps/web/src/app/api/knowledge/retrieve/route.ts`

```typescript
// Pseudocode — actual implementation follows ARCHIE's Next.js API patterns

export async function GET(request: Request) {
  // CYRUS: RBAC guard — ADMIN role only
  const session = await verifySession(request);
  if (session.role !== 'ADMIN') return unauthorized();

  const { query, framework, module, limit = 5 } = parseParams(request);

  // Embed the query using the same model
  const queryEmbedding = await embedViaOllama(query, 'nomic-embed-text');

  // Cosine similarity search with optional metadata filters
  const results = await prisma.$queryRaw`
    SELECT id, content, source_file, source_type, module, framework_tag, author,
           1 - (embedding <=> ${queryEmbedding}::vector) as relevance_score
    FROM knowledge_chunks
    WHERE (${ framework ? `framework_tag = ${framework}` : 'TRUE' })
      AND (${ module ? `module = ${module}` : 'TRUE' })
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return Response.json({ chunks: results });
}
```

---

## Security & Compliance Review

### RUTH (Compliance) — APPROVED

- **PHI involvement:** NONE. This table stores MBA academic content (published articles, course discussion posts, lecture notes). Zero patient data, zero clinical data, zero PII.
- **LGPD applicability:** Not applicable. No personal data of third parties is stored. Discussion post content is from a university course and does not contain protected personal information.
- **SaMD impact:** None. This system supports internal strategy decisions, not clinical decision-making.

### CYRUS (Security) — APPROVED with conditions

- **RBAC:** The retrieval API route MUST use `createProtectedRoute` with ADMIN role restriction. No public access.
- **Data sovereignty:** All data stays local. Embeddings are generated via local Ollama. No external API calls.
- **Audit:** Data access to `knowledge_chunks` does NOT require a GovernanceEvent (no patient data). Standard application logging is sufficient.
- **Secrets:** No API keys required. Ollama runs locally. Database connection uses existing credentials.

### QUINN (QA) — Requirements

- Ingestion script must include a `--dry-run` flag for testing without database writes.
- Retrieval API route must have at least one integration test verifying RBAC enforcement.
- Embedding consistency test: verify that the same input produces the same vector (determinism check).

---

## Cost Analysis (GORDON)

| Component | Cost | Notes |
|---|---|---|
| Ollama `nomic-embed-text` | $0 | Runs locally, ~2GB model, already on machine |
| PostgreSQL + pgvector | $0 incremental | Already running. Table adds ~50MB for 1,000 chunks. |
| Python ingestion script | $0 | One-time development |
| Next.js API route | $0 incremental | Runs on existing server |
| **Total marginal cost** | **$0** | All components use existing infrastructure |

Estimated one-time development effort: 4-6 hours (script + API route + tests).

---

## Alternatives Considered

### Alternative 1: External Vector Database (Pinecone, Weaviate)

**Rejected.** Adds infrastructure cost ($70+/month), external dependency, and sends MBA content to a third-party API. Violates the local-first principle.

### Alternative 2: File-Based RAG (Markdown + Grep)

**Rejected.** The current Phase 1 (cursor rule) is essentially this approach. It works for 5 core frameworks but does not scale to the full corpus of 12+ readings, 100+ discussion posts, and growing lecture notes. Semantic search over embeddings provides relevance ranking that keyword search cannot.

### Alternative 3: Dedicated RAG SaaS (Perplexity, Glean)

**Rejected.** Costs money, sends content externally, and does not integrate with the Boardroom agent workflow. The value of this system is its integration into the existing agent loop, not its standalone search capability.

### Alternative 4: Claude MCP Knowledge Base

**Considered for future.** If Anthropic ships a built-in knowledge base feature for MCP servers, this would be the natural upgrade path. The pgvector approach is designed to be replaceable — the `knowledge_chunks` schema is simple enough to export to any future system.

---

## Implementation Phases

### Phase 2a: Schema + Ingestion (Next Session)

1. Add pgvector extension to database if not already present.
2. Create Prisma migration for `knowledge_chunks` table.
3. Implement `scripts/knowledge/ingest_mba.py` with all document loaders.
4. Run initial ingestion of all 12+ PDF readings and course DOCX.
5. Verify storage and embedding quality with sample queries.

### Phase 2b: Retrieval API (Following Session)

1. Implement `GET /api/knowledge/retrieve` with RBAC guard.
2. Add integration test for RBAC enforcement.
3. Test retrieval quality: do top-5 results for "partnership structural risk" return Aron & Singh content?
4. Document the API in the project's API reference.

### Phase 2c: Agent Integration (Future)

1. Modify Boardroom agent workflow to optionally query the knowledge base when strategy-related questions arise.
2. Add a `--knowledge-context` flag to the agent activation protocol.
3. Measure: do agent recommendations improve when grounded in MBA framework content?

---

## Source Material Inventory

### PDF Readings (12 files)

| File | Framework Tag | Module |
|---|---|---|
| Porter — How Smart Connected Products Are Transforming Competition | `porter_heppelmann` | M1 |
| Shapiro — The Information Economy | `shapiro_varian` | M1 |
| McAfee & Brynjolfsson — Big Data: The Management Revolution | `mcafee_brynjolfsson` | M3 |
| Aron & Singh — Getting Offshoring Right | `aron_singh` | M3 |
| Amazon Apple Facebook Google | `platform_economics` | M2 |
| Social Strategy at Amex | `platform_economics` | M2 |
| McKinsey — Making the Most of Advanced Analytics | `analytics_capability` | M3 |
| Cohen — To Be Made Here or Elsewhere | `outsourcing_decisions` | M3 |
| New Age of Walmart | `platform_economics` | M2 |
| Outsourcing and Offshoring — Rise of the Software Machines | `labor_automation` | M3 |
| Comcast's Future | `platform_economics` | M2 |
| Who Will Satisfy China's Thirst for Industrial Robots | `labor_automation` | M3 |
| BBC — Intelligent Machines: The Jobs Robots Will Steal First | `labor_automation` | M3 |

### Course Content

| File | Type | Module |
|---|---|---|
| BU350620_Digital_Transformation_Course_Content.docx | Course syllabus & materials | All |

### Discussion Posts

To be ingested as structured text from the Canvas LMS exports or manual copy. Each post should be tagged with the discussion thread's assigned article and the contributor name.

---

## Decision Record

| Decision | Rationale |
|---|---|
| Local Ollama for embeddings | Zero cost, zero data exfiltration, already installed |
| pgvector in existing PostgreSQL | No new infrastructure, ARCHIE's preferred stack |
| Track A extension table | Follows AVI-005 (no core table modifications for app-specific data) |
| ADMIN-only RBAC | Internal tool. No patient-facing use case. Cyrus minimum viable security. |
| 512-token chunks with 50-token overlap | Balance between context preservation and retrieval precision. Standard for RAG pipelines. |
| Framework keyword tagging | Enables filtered retrieval (e.g., "give me only Aron & Singh content"). Simple and effective. |

---

*ADR Author: ARCHIE*
*Strategy Sponsor: VICTOR*
*Security Review: CYRUS — APPROVED*
*Compliance Review: RUTH — APPROVED (no PHI, no LGPD impact)*
