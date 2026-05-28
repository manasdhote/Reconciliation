# Reconcile.IO — Transaction Reconciliation Engine

Reconcile.IO is a production-ready **Transaction Reconciliation Engine** built in Node.js, Express, and MongoDB. It is designed to ingest crypto transaction datasets from two different perspectives (User exports and Exchange records), normalize their schema, perform data validation/flagging, and execute a mathematically optimized 1-to-1 matching algorithm with configurable tolerances.

It exposes standard REST APIs and features a sleek, self-contained, custom **Dark Mode Verification Dashboard** to easily execute, filter, and inspect runs.

---

## Key Core Features

1. **Robust Ingestion & Data Quality Layer**
   - Parses CSV streams using `csv-parser`.
   - Validates every record. Bad rows (e.g. missing IDs, negative quantities, or malformed/missing timestamps) are **never silently ignored**. Instead, they are flagged as `INVALID` with precise error reasons, stored in MongoDB, and logged in the UI's Data Quality log for auditing.
2. **Intelligent Normalization**
   - **Asset Casing & Aliases**: Resolves case-insensitivity and aliases gracefully (e.g., matching User `bitcoin` or Exchange `btc` to standardized `BTC`).
   - **Perspective Type Matching**: Map different perspective terminologies, matching User `TRANSFER_OUT` with Exchange `TRANSFER_IN` to standardized `TRANSFER`.
3. **Optimized 1-to-1 Matching Engine**
   - Compares transactions within configurable limits: **Timestamp Tolerance** ($\pm T$ seconds) and **Quantity Tolerance** ($\pm Q\%$).
   - Solves the **multiple candidate match problem** by calculating a combined mathematical "distance weight" between candidates, matching the closest pairs first. This guarantees no transaction is double-matched or matched out of order.
   - Gracefully pairs "near-misses" that exceeded tolerances as `CONFLICTING` with detailed structural explanations (e.g., *"Quantity mismatch: User 0.3 vs Exchange 0.3001 (diff 0.033%)"*).
   - Flags orphaned entries as `UNMATCHED_USER` or `UNMATCHED_EXCHANGE`.
4. **REST APIs & Stream-based CSV Exporter**
   - Fully documented endpoints to run matching, query runs, filter unmatched items, and download the reconciled report as a standard CSV.
6. **Asynchronous Processing with Hybrid Failover**
   - Integrates **BullMQ** and **Redis** to queue ingestion and matching tasks in the background, immediately returning a `202 Accepted` response.
   - **Self-Healing Failover Pattern**: If Redis is not running, the engine automatically detects it, logs a clean console warning, and seamlessly switches to a local **Asynchronous In-Memory Queue** (using Node `setImmediate`), ensuring it runs flawlessly out-of-the-box in any environment.
7. **Graceful Port Shutdown & Socket Cleanup**
   - Listens to termination signals (`SIGINT`, `SIGTERM`).
   - Automatically closes the Express HTTP port, Mongoose MongoDB socket connection, and `ioredis` socket pool on exit, ensuring **zero orphaned port listeners** remain active.

---

## 🛠️ Step-by-Step Installation Guide

Follow these instructions to set up the project on your local machine:

### Step 1: Environment Configuration (`.env`)
The engine uses standard environment variables for configuration. We have provided a template file called `.env.example` in the root of the project.
1. Copy the `.env.example` file and rename it to `.env`:
   ```bash
   copy .env.example .env
   ```
2. Open `.env` and customize the parameters if needed:
   * `PORT`: The port the web server will run on (Default: `3000`).
   * `MONGO_URI`: The MongoDB connection string (Default: `mongodb://localhost:27017/reconciliation_engine`).
   * `TIMESTAMP_TOLERANCE_SECONDS`: Time tolerance limit in seconds for a match (Default: `300`).
   * `QUANTITY_TOLERANCE_PCT`: Quantity tolerance limit in percentage (Default: `0.01`).
   * `REDIS_HOST`: Host for Redis/BullMQ (Default: `127.0.0.1`).
   * `REDIS_PORT`: Port for Redis/BullMQ (Default: `6379`).

---

### Step 2: Install and Run MongoDB
You can run MongoDB either natively on Windows or via Docker:

#### Option A: Install Natively on Windows
1. Go to the [MongoDB Community Server Download Page](https://www.mongodb.com/try/download/community).
2. Set the platform to **Windows** and package to **MSI**, then click **Download**.
3. Run the downloaded `.msi` file and select **Complete** installation.
4. Keep **"Run service as Network Service user"** checked (this runs MongoDB as a service automatically in the background).
5. Ensure **"Install MongoDB Compass"** is checked (this gives you a graphic dashboard to view databases).
6. Click **Install** and wait for completion. Open MongoDB Compass and hit **Connect** to verify it is running on `mongodb://localhost:27017`.

#### Option B: Run via Docker (Quickest)
If you have Docker installed, simply run:
```bash
docker run -d -p 27017:27017 --name local-mongo mongo:latest
```

---

### Step 3: Set Up Redis (Optional but Recommended)
The engine integrates **BullMQ** for robust, asynchronous background processing. 
* **💡 Hybrid Failover Feature**: If Redis is not installed or running, the engine automatically detects it, logs a clean warning, and **seamlessly switches to a local In-Memory Task Queue** using Node's `setImmediate`. You can completely skip running Redis and the application will still work perfectly out-of-the-box!

If you want to use the Redis-backed queue:
* **Using Docker**: Run the following command:
  ```bash
  docker run -d -p 6379:6379 --name local-redis redis:alpine
  ```
* **Without Docker (Windows)**: You can install Redis using WSL (`wsl sudo apt-get install redis`) or download a native Windows build.

---

### Step 4: Add Your Transaction CSV Files
To run the reconciliation engine, you need two datasets:
1. **User Exported Transactions**: Contains transaction data from the user's perspective.
2. **Exchange Exported Transactions**: Contains transaction data from the exchange's perspective.

There are two ways to load these files:
* **Automatic Fallback (easiest)**: Name your files `user_transactions.csv` and `exchange_transactions.csv` and place them directly in the **root directory** of the project. The engine will automatically read these files if no files are uploaded via the request.
* **Upload via UI/API**: You can upload custom CSV files dynamically at any time using the dashboard file uploaders or via the `POST /api/reconcile` multi-part API.

---

### Step 5: Install Dependencies & Run the Application
1. Open your terminal in the project directory (`c:\Users\priya\PROJECTS\Transaction Reconciliation Engine`).
2. Install the node packages:
   ```bash
   npm install
   ```
3. Start the server in production mode:
   ```bash
   npm start
   ```
   Or run with hot-reload in development mode (requires `nodemon`):
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```
   You will see the beautiful **Dark Mode Verification Dashboard** where you can trigger runs, view reconciliation stats, inspect mismatches, download reports, and audit data quality!

---


## 📡 REST API Documentation

All routes are prefixed with `/api`.

### 1. `POST /api/reconcile`
Runs the reconciliation process.
* **Request Body** (JSON or multipart/form-data):
  ```json
  {
    "timestampTolerance": 300,
    "quantityTolerancePct": 0.01
  }
  ```
  *(Note: You can also upload two CSV files labeled `userCsv` and `exchangeCsv`. If no files are uploaded, the engine automatically falls back to reading the default `user_transactions.csv` and `exchange_transactions.csv` pre-loaded in your project root folder!)*
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Reconciliation process completed successfully.",
    "runId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "run": { ... }
  }
  ```

### 2. `GET /api/runs`
Lists all reconciliation runs in descending order.

### 3. `GET /api/report/:runId`
Returns the full reconciliation report including summary metadata and any invalid ingestion logs.

### 4. `GET /api/report/:runId/summary`
Returns counts of categories (`matchedCount`, `conflictingCount`, `unmatchedUserCount`, etc.) for the run.

### 5. `GET /api/report/:runId/unmatched`
Returns only unmatched rows (`UNMATCHED_USER` and `UNMATCHED_EXCHANGE`).

### 6. `GET /api/report/:runId/download`
Downloads the reconciliation report as a fully formatted, standard `.csv` file.

---

## 📊 Ingestion Data Quality Rules

The engine parses the CSV files and enforces these validation checks before running the matching logic:

| Check | Condition | Ingestion Status | Ingestion Error Message |
| :--- | :--- | :--- | :--- |
| **Transaction ID** | Missing / Empty | `INVALID` | `"Missing transaction_id"` |
| **Timestamp** | Missing / Empty | `INVALID` | `"Missing timestamp"` |
| **Timestamp Format** | Malformed string (e.g. `2024-03-09T`) | `INVALID` | `"Malformed timestamp: \"...\""` |
| **Quantity** | Missing / Empty | `INVALID` | `"Missing quantity"` |
| **Quantity Number** | Not a valid float | `INVALID` | `"Invalid quantity (not a number): \"...\""` |
| **Quantity Range** | Negative value (e.g. `-0.1`) | `INVALID` | `"Negative quantity: -0.1"` |
| **Asset** | Missing / Empty | `INVALID` | `"Missing asset type"` |

All invalid rows are saved to MongoDB and can be audited inside the **Data Quality Log** tab on the dashboard.

---

## 🧮 Matching Engine Logic (Tolerances & Conflict Triggers)

During execution, valid transactions are grouped by asset and type (e.g., `BTC_BUY`). Within each group:

1. **Tolerances Checked**:
   - $\text{Time Difference} \le \text{timestampTolerance}$
   - $\text{Quantity \% Difference} = \frac{|Q_{\text{user}} - Q_{\text{exchange}}|}{Q_{\text{user}}} \times 100 \le \text{quantityTolerancePct}$
2. **One-to-One Match Weight Resolution**:
   If a transaction has multiple potential matching candidates, the engine calculates a **distance weight**:
   $$\text{Weight} = \frac{\text{Time Difference}}{\text{timestampTolerance}} + \frac{\text{Quantity \% Difference}}{\text{quantityTolerancePct}}$$
   The pair with the **lowest weight** (closest match) is paired. Both transactions are locked so they cannot be double-matched.
3. **Conflicts Triggered**:
   Remaining unmatched transactions are analyzed for "near-misses" (i.e. within 10x tolerance scale). If a near-miss pair exists with the same asset & type, it is paired as `CONFLICTING` with a clear audit text explaining the deviation.
