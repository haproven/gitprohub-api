# GitProHub API — Project & Testing Documentation

## 1. Project Overview

**GitProHub API** is a GitHub repository verification, registration, submission and monitoring API developed for the GitProHub ecosystem.

It automatically checks repositories containing a `gitprohub.md` metadata file, validates repository details, stores verified project information and keeps registered project data updated.

- **Project:** GitProHub API
- **Version:** 1.3.0
- **Repository:** https://github.com/haproven/gitprohub-api
- **Live API:** https://gitprohub-api.onrender.com
- **Technology:** Node.js, Express.js
- **Database:** JSON-based database
- **Database location:** `database/projects.json`
- **Local development:** `http://localhost:3000`

---

## 2. How GitProHub API Works

GitProHub API connects GitHub repositories with the GitProHub verification system.

### Workflow

1. A GitHub repository contains a `gitprohub.md` file.
2. The API retrieves repository information from GitHub.
3. The metadata file is fetched and parsed.
4. Project details are validated.
5. The project is registered or submitted.
6. Verified project data is stored in `database/projects.json`.
7. The scanner periodically checks registered repositories.
8. Repository metadata is updated when changes are detected.
9. If the metadata file is permanently missing (404), the project is removed from the database.
10. API endpoints allow users to retrieve, verify and inspect registered projects.

---

## 3. Project Structure

```text
gitprohub-api/
│
├── database/
│   └── projects.json
│
├── src/
│   ├── routes/
│   │   ├── register.js
│   │   ├── submit.js
│   │   ├── projects.js
│   │   └── verify.js
│   │
│   ├── services/
│   │   ├── validator.js
│   │   ├── github.js
│   │   └── scanner.js
│   │
│   └── server.js
│
├── .env
├── package.json
└── README.md
```

---

## 4. API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | API status and endpoint information |
| `/api/github` | GET | GitHub connection status |
| `/api/projects` | GET | Get all registered projects |
| `/api/projects/:id` | GET | Get a project by ID |
| `/api/verify/:owner/:repository` | GET | Verify a GitHub repository |
| `/api/submit` | POST | Submit or update a repository |
| `/api/register` | POST | Authorized repository registration |
| `/api/scan` | POST | Manually trigger repository scanning |

---

## 5. Core Services

### Validator

File: `src/services/validator.js`

Responsibilities:

- Parse `gitprohub.md`.
- Validate required metadata fields.
- Check protocol validity.
- Validate project ID.
- Validate repository owner and name.
- Validate repository URL consistency.

Required metadata:

- `id`
- `name`
- `owner`
- `repository`

### GitHub Service

File: `src/services/github.js`

Responsibilities:

- Communicate with GitHub API.
- Retrieve repository information.
- Retrieve latest commits.
- Retrieve `gitprohub.md`.
- Authenticate using GitHub token where configured.

### Scanner

File: `src/services/scanner.js`

Responsibilities:

- Scan Haproven repositories.
- Scan registered external repositories.
- Skip forks and archived repositories.
- Validate metadata.
- Add new projects.
- Update existing project information.
- Remove projects when their metadata file is confirmed missing.
- Preserve project records when temporary errors occur.
- Report scan statistics.

### Register Service

File: `src/routes/register.js`

Responsibilities:

- Authenticate registration requests.
- Validate owner, repository and commit.
- Fetch metadata from the specified commit.
- Validate the metadata.
- Register or update projects.

### Submit Service

File: `src/routes/submit.js`

Responsibilities:

- Accept repository owner and name.
- Validate input.
- Check repository availability.
- Reject private and archived repositories.
- Fetch the latest commit.
- Fetch and validate `gitprohub.md`.
- Add or update project records.
- Prevent duplicate records.

### Projects Service

File: `src/routes/projects.js`

Responsibilities:

- Return all registered projects.
- Retrieve a project using its ID.
- Support case-insensitive project ID lookup.
- Return appropriate errors for unavailable projects.

### Verify Service

File: `src/routes/verify.js`

Responsibilities:

- Verify a repository against stored project records.
- Match owner and repository case-insensitively.
- Return verification status.
- Return project information when verified.

---

## 6. Repository Metadata

Repositories must provide a valid `gitprohub.md` file.

The metadata must contain the required fields and follow the GitProHub protocol.

The validator checks:

- Metadata file existence.
- Valid format.
- Required fields.
- Valid project ID.
- Valid owner and repository names.
- Correct GitHub repository URL.

Invalid or incomplete metadata cannot be successfully registered.

---

## 7. Automated Scanning

The API automatically scans repositories at startup and periodically.

### Scan interval

- Every 5 minutes.

### Scan operations

- Discover eligible repositories.
- Fetch metadata.
- Validate project information.
- Add newly discovered projects.
- Update existing projects.
- Remove records when the metadata file is confirmed missing.
- Skip temporary failures.

### Scan response statistics

| Field | Description |
|---|---|
| `success` | Scan completion status |
| `scanned` | Repositories processed |
| `added` | Newly added projects |
| `updated` | Updated project records |
| `removed` | Removed project records |
| `skipped` | Skipped repositories |

---

## 8. Testing Record

Testing was performed on the local API using PowerShell and HTTP requests.

### Test 1 — API Homepage

**Endpoint:** `GET /`

**Test:** Retrieve API status.

**Result:** PASS

Verified:

- API name.
- Online status.
- Version.
- Endpoint information.

### Test 2 — GitHub Connection

**Endpoint:** `GET /api/github`

**Result:** PASS

Verified:

- GitHub connection status.
- GitHub account login.
- API integration.

### Test 3 — Projects Listing

**Endpoint:** `GET /api/projects`

**Result:** PASS

Verified:

- Project listing.
- JSON response.
- Project count.
- Project metadata.

**Observed project count:** 6

### Test 4 — Individual Project Retrieval

**Endpoint:** `GET /api/projects/haproven`

**Result:** PASS

Verified:

- Project lookup by ID.
- Project information response.

### Test 5 — Unknown Project

**Endpoint:** `GET /api/projects/unknown-project`

**Result:** PASS

Verified:

- Missing project handling.
- `Project not found` response.

### Test 6 — Case-Insensitive Project Lookup

**Endpoint:** `GET /api/projects/HAPROVEN`

**Result:** PASS

Verified:

- Case-insensitive project ID matching.
- Correct project retrieval.

### Test 7 — Repository Verification

**Endpoint:** `GET /api/verify/haproven/haproven`

**Result:** PASS

Verified:

- Repository verification.
- Verified status.
- Project data response.

### Test 8 — Unknown Repository Verification

**Endpoint:** `GET /api/verify/unknown-user/unknown-repo`

**Result:** PASS

Verified:

- Unknown repository handling.
- `verified: false`.
- Null project response.

### Test 9 — Register Authorization

**Endpoint:** `POST /api/register`

**Test:** Request without authorization token.

**Result:** PASS

Verified:

- Unauthorized request rejection.
- `Unauthorized` response.

### Test 10 — Register Required Fields

**Endpoint:** `POST /api/register`

**Test:** Valid authorization with empty request body.

**Result:** PASS

Verified:

- Required owner, repository and commit validation.
- `Owner, repository and commit required` response.

### Test 11 — Invalid Repository Details

**Endpoint:** `POST /api/register`

**Test:** Invalid owner and commit information.

**Result:** PASS

Verified:

- Repository detail validation.
- `Invalid repository details` response.

### Test 12 — Invalid Commit / Missing Metadata

**Endpoint:** `POST /api/register`

**Test:** Valid-format request using a fake commit SHA.

**Result:** PASS

Verified:

- Commit-based metadata lookup.
- Missing metadata handling.
- `gitprohub.md not found` response.

### Test 13 — Manual Scanner Authorization

**Endpoint:** `POST /api/scan`

**Test:** Request without authorization.

**Result:** PASS

Verified:

- Scanner endpoint protection.
- `Unauthorized` response.

### Test 14 — Authorized Manual Scan

**Endpoint:** `POST /api/scan`

**Test:** Scanner request with valid API token.

**Result:** PASS

Observed scan response:

| Field | Result |
|---|---:|
| Success | True |
| Scanned | 24 |
| Added | 0 |
| Updated | 6 |
| Removed | 0 |
| Skipped | 12 |

Verified:

- Authorized scan execution.
- Repository scanning.
- Metadata updates.
- Scan statistics.

### Test 15 — Repository Submission

**Endpoint:** `POST /api/submit`

**Test:** Submit an external GitHub repository.

**Result:** PASS

Verified:

- External repository submission.
- GitHub repository metadata retrieval.
- `gitprohub.md` validation.
- Database registration.

### Test 16 — External Repository Submission

**Repository:** `codersusheel/gitprohub-submit-test`

**Result:** PASS

Verified:

- External account repository registration.
- Repository validation.
- Database record creation.

### Test 17 — Repository Metadata Update

**Repository:** `codersusheel/gitprohub-submit-test`

**Result:** PASS

Verified:

- Metadata changes.
- Latest commit information.
- Updated description.
- Database synchronization.

### Test 18 — Duplicate Submission

**Endpoint:** `POST /api/submit`

**Repository:** `codersusheel/gitprohub-submit-test`

**Result:** PASS

Verified:

- Existing project update.
- Duplicate record prevention.
- Existing repository matching.

**Verified duplicate record count:** 1

### Test 19 — Multiple External Repositories

**Repositories:**

- `codersusheel/gitprohub-submit-test`
- `codersusheel/Codersusheel`

**Result:** PASS

Verified:

- Multiple external repository registration.
- Owner and repository matching.
- Database storage.

### Test 20 — Missing Metadata Removal

**Repository:** `codersusheel/gitprohub-test`

**Test:** Delete `gitprohub.md` and run scanner.

**Result:** PASS

Verified:

- Metadata file missing detection.
- Existing record removal.
- Database consistency.

### Test 21 — Scanner Removal Logic

**Test:** Verify missing metadata repository removal after deployment.

**Result:** PASS

Verified:

- Scanner removal logic.
- Deployment functionality.
- Live API record removal.

### Test 22 — Live API Verification

**API:** `https://gitprohub-api.onrender.com`

**Result:** PASS

Verified:

- Live API response.
- Deployment availability.
- Repository removal reflected in live project data.

---

## 9. Database Management

Database file:

`database/projects.json`

The database stores verified repository information.

Typical information includes:

- Project ID.
- Project name.
- Owner.
- Repository.
- Description.
- Repository URL.
- Commit SHA.
- Verification status.
- Registration and update information.

Database operations:

- Add new records.
- Update existing records.
- Prevent duplicates.
- Remove records when metadata is confirmed missing.

---

## 10. Security

Implemented security features:

- Bearer-token authorization for `/api/register`.
- Bearer-token authorization for `/api/scan`.
- GitHub token stored in environment variables.
- Input validation.
- Commit SHA validation.
- Repository owner and name validation.
- Metadata validation.
- Private repository rejection in submission flow.
- Archived repository rejection in submission flow.

**Note:** `/api/submit` is currently implemented without a Bearer-token authorization requirement. It should be treated as a public submission endpoint.

---

## 11. Deployment

### Local development

```powershell
npm install
npm start
```

Local server:

`http://localhost:3000`

### Live deployment

`https://gitprohub-api.onrender.com`

Deployment verification has included:

- API homepage.
- GitHub connection.
- Project listing.
- Repository verification.
- Scanner-related live verification.

---

## 12. Testing Summary

| Category | Status |
|---|---|
| API homepage | PASS |
| GitHub connection | PASS |
| Projects listing | PASS |
| Individual project lookup | PASS |
| Unknown project handling | PASS |
| Case-insensitive lookup | PASS |
| Repository verification | PASS |
| Unknown repository verification | PASS |
| Register authorization | PASS |
| Register input validation | PASS |
| Invalid repository details | PASS |
| Invalid commit / missing metadata | PASS |
| Scanner authorization | PASS |
| Authorized manual scanning | PASS |
| External repository submission | PASS |
| Repository metadata updates | PASS |
| Duplicate submission prevention | PASS |
| Multiple external repositories | PASS |
| Missing metadata removal | PASS |
| Scanner removal logic | PASS |
| Live deployment verification | PASS |

<escape>Overall testing status: All tests listed above passed during the recorded testing sessions. Additional tests may be required after future changes.</escape>

---

## 13. Future Testing

Potential future tests:

- Rate-limit handling.
- GitHub API quota handling.
- Network timeout recovery.
- Invalid JSON metadata.
- Missing individual metadata fields.
- Private repository rejection.
- Archived repository rejection.
- Fork handling.
- Concurrent submissions.
- Database corruption recovery.
- Database write failure.
- Scanner recovery after temporary GitHub errors.
- Render restart and persistence.
- Automated test suite using Node.js test runner.

---

## 14. Project Status

**GitProHub API Version:** 1.3.0

The API has been tested for repository registration, submission, verification, project retrieval, duplicate prevention, scanning, metadata updates and missing-metadata removal.

The project is operational locally and deployed to the live API environment.

**Project:** GitProHub API  
**Organization:** Haproven  
**Repository:** https://github.com/haproven/gitprohub-api  
**Live API:** https://gitprohub-api.onrender.com
