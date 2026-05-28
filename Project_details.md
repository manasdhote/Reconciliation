# Backend Assignment — Understanding & Requirements

# Objective

Build a backend-based **Transaction Reconciliation Engine** using Node.js.

The system receives two transaction datasets:

1. User exported transactions
2. Exchange exported transactions

Both datasets represent the same crypto activity but:
- may contain inconsistencies
- may contain messy/incomplete data
- may not match perfectly

The goal is to:
- ingest both datasets
- normalize and validate data
- intelligently match transactions
- detect conflicts/unmatched records
- generate reconciliation reports
- expose REST APIs for accessing reports

---

# Core Problem Statement

Two CSV files describe the same crypto account activity from two different perspectives.

The engine must determine:

- Which transactions match
- Which transactions conflict
- Which exist only in one source
- Why mismatches occurred

---

# Main Features Required

## 1. CSV Ingestion

### Tasks
- Parse both CSV files
- Store parsed records in MongoDB
- Handle malformed/incomplete rows
- Log ingestion issues

### Important
Bad rows must NOT be silently ignored.

Instead:
- preserve original row
- flag issue reason

Example:
- invalid timestamp
- missing quantity
- invalid asset
- malformed CSV row

---

# 2. Transaction Matching Engine

Build logic that matches:
- user transaction
WITH
- exchange transaction

---

## Matching Rules

### Asset Match
- Case insensitive
- Handle aliases

Example:
- BTC == Bitcoin
- ETH == Ethereum

---

### Type Match

Types may differ by perspective.

Example:
- Exchange: TRANSFER_IN
- User: TRANSFER_OUT

Both should map to same normalized type.

---

### Timestamp Tolerance

Transactions match if timestamps are within:

Default:
- ± 300 seconds

But:
- must be configurable

---

### Quantity Tolerance

Transactions match if quantity difference is within:

Default:
- 0.01%

But:
- must be configurable

---

# 3. Reconciliation Categories

Each transaction pair must fall into ONE category.

---

## MATCHED

Transactions successfully matched within tolerance.

---

## CONFLICTING

Potential match exists but:
- quantity mismatch
OR
- timestamp mismatch
OR
- major field mismatch

Reason must be provided.

---

## UNMATCHED_USER

Transaction exists only in user file.

---

## UNMATCHED_EXCHANGE

Transaction exists only in exchange file.

---

# 4. Reconciliation Report

Generate reconciliation report in CSV format.

Each report row should contain:
- original user row
- original exchange row
- category
- reason

---

# 5. REST APIs

Required endpoints:

## POST /reconcile

Triggers reconciliation process.

Can accept custom tolerances.

---

## GET /report/:runId

Returns full reconciliation report.

---

## GET /report/:runId/summary

Returns counts:
- matched
- conflicting
- unmatched

---

## GET /report/:runId/unmatched

Returns only unmatched rows.

---

# Configuration Requirements

Must support configurable tolerances WITHOUT code changes.

Possible methods:
- environment variables
- config file
- request body overrides

Required configs:

```env
TIMESTAMP_TOLERANCE_SECONDS=300
QUANTITY_TOLERANCE_PCT=0.01
```

---

# Expected Tech Stack

Recommended:
- Node.js
- Express.js
- MongoDB
- Mongoose

Helpful libraries:
- csv-parser
- dotenv
- uuid
- winston

---

# Key Engineering Expectations

The assignment evaluates:

- backend architecture
- data quality handling
- reconciliation logic
- clean code
- scalability thinking
- edge case handling
- API design
- database design
- production mindset

---

# Important Edge Cases

Need to handle:
- duplicate transactions
- multiple possible matches
- malformed timestamps
- missing fields
- asset aliases
- type normalization
- floating point precision issues
- timezone inconsistencies

---

# Important Design Decisions

## One-to-One Matching

One transaction should match only one counterpart.

Avoid duplicate matching.

---

## Preserve Raw Data

Store original CSV row for:
- debugging
- auditing
- traceability

---

## Normalization Layer

Before matching:
- normalize asset names
- normalize transaction types
- normalize casing

---

# Recommended Architecture

```txt
src/
 ├── controllers/
 ├── services/
 ├── models/
 ├── routes/
 ├── utils/
 ├── config/
 ├── middleware/
 └── data/
```

---

# Database Collections

Suggested collections:

## transactions
Stores ingested transactions.

## reconciliationRuns
Stores reconciliation execution metadata.

## reports
Stores reconciliation results.

---

# Matching Algorithm Strategy

Recommended flow:

1. Normalize transactions
2. Group by asset + type
3. Compare timestamps
4. Compare quantities
5. Select best match
6. Mark matched records
7. Generate report entries

---

# Production-Level Expectations

Good solutions should include:
- logging
- modular architecture
- reusable services
- proper error handling
- validation
- meaningful commit history
- professional README

---

# Deliverables

Need to submit:
- public GitHub repository
- complete source code
- README.md
- setup instructions
- API documentation
- assumptions/design decisions

---

# Overall Goal

Demonstrate:
- backend engineering ability
- system design thinking
- ability to handle real-world messy financial data
- production-quality coding practices