# GitProHub API — Project & Testing Documentation

## 1. Introduction

GitProHub API is a backend service developed for the GitProHub ecosystem to verify, register, submit, retrieve and monitor GitHub repositories that follow the GitProHub metadata protocol.

The API connects GitHub repositories with the GitProHub verification system. It checks repository information, reads the `gitprohub.md` file, validates project details, stores verified project records and periodically synchronizes repository information.

The purpose of GitProHub API is to provide a reliable and consistent way to identify GitProHub-compatible projects without manually checking every repository.

### Project Information

| Property | Details |
|---|---|
| Project Name | GitProHub API |
| Version | 1.3.0 |
| Organization | Haproven |
| Repository | https://github.com/haproven/gitprohub-api |
| Live API | https://gitprohub-api.onrender.com |
| Local API | http://localhost:3000 |
| Technology | Node.js, Express.js |
| Database | JSON-based database |
| Database File | `database/projects.json` |
| Project Type | REST API |
| Purpose | GitHub repository verification, registration, submission and monitoring |

---

## 2. What Is GitProHub API?

GitProHub API is a service that helps the GitProHub ecosystem recognize and maintain verified GitHub project records.

A GitHub repository can participate in the GitProHub system by providing a `gitprohub.md` metadata file containing the project's required information.

Instead of manually collecting repository information, the API performs the following tasks:

- Connects to GitHub.
- Retrieves repository information.
- Reads the project's `gitprohub.md` file.
- Validates the repository metadata.
- Registers or submits compatible repositories.
- Stores project information in a local JSON database.
- Checks registered repositories periodically.
- Updates project information when necessary.
- Removes records when metadata is confirmed to be permanently missing.
- Provides API endpoints for retrieving and verifying project records.

GitProHub API acts as a bridge between GitHub repositories and the GitProHub ecosystem.

---

## 3. Why Was GitProHub API Developed?

Managing project information manually can become difficult when multiple repositories belong to different GitHub users.

Manually checking repository information, metadata, project IDs, commits and registration status requires additional time and effort.

GitProHub API was developed to automate these processes.

### Main objectives

- **Repository verification:** Verify repositories using GitProHub metadata.
- **Project registration:** Register repositories through an authorized registration endpoint.
- **Project submission:** Allow repositories to submit themselves for inclusion.
- **Automated synchronization:** Keep stored project information updated.
- **Duplicate prevention:** Prevent duplicate project records for the same repository.
- **Metadata validation:** Ensure repositories follow the required GitProHub protocol.
- **Repository monitoring:** Periodically scan eligible repositories.
- **Database management:** Maintain verified project records.
- **API access:** Make project information accessible through HTTP endpoints.

---

## 4. How GitProHub API Works

GitProHub API uses GitHub's API and repository metadata to identify and maintain GitProHub-compatible projects.

### General workflow

1. A GitHub repository contains a `gitprohub.md` metadata file.
2. GitProHub API retrieves repository information from GitHub.
3. The API fetches the metadata file.
4. The metadata is parsed and validated.
5. Required fields and repository details are checked.
6. The repository is submitted, registered or discovered through scanning.
7. Valid project information is stored in `database/projects.json`.
8. The API periodically scans repositories to detect changes.
9. Existing project records are updated when valid metadata is retrieved.
10. Repository records are removed when the metadata file is confirmed to be missing.
11. API endpoints provide access to project information and verification results.

### Workflow diagram

GitHub Repository  
↓  
`gitprohub.md`  
↓  
GitProHub API  
↓  
Repository Information Retrieval  
↓  
Metadata Parsing & Validation  
↓  
Registration / Submission / Scanning  
↓  
`database/projects.json`  
↓  
Project Retrieval & Verification API

---

## 5. GitProHub Metadata Protocol

GitProHub API requires repositories to provide a valid `gitprohub.md` metadata file.

This file identifies the project and provides the information needed to validate and register it.

### Required metadata

- `id`
- `name`
- `owner`
- `repository`

The metadata must follow the GitProHub protocol and match the actual GitHub repository.

### Metadata validation

The validator checks:

- Metadata file format.
- Protocol validity.
- Required fields.
- Project ID validity.
- Owner information.
- Repository name.
- Repository URL consistency.
- Repository identity.

Invalid or incomplete metadata cannot be successfully registered through the validation process.

---

## 6. Project Architecture

GitProHub API is built using Node.js and Express.js.

The application is organized into routes, services, database storage and server configuration.

### Project structure

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

### Architecture responsibilities

| Component | Responsibility |
|---|---|
| `server.js` | Starts the server, manages endpoints and initiates scanning |
| `routes/register.js` | Handles authorized project registration |
| `routes/submit.js` | Handles public project submissions |
| `routes/projects.js` | Retrieves stored project information |
| `routes/verify.js` | Verifies repositories against stored records |
| `services/validator.js` | Parses and validates metadata |
| `services/github.js` | Communicates with GitHub |
| `services/scanner.js` | Discovers, checks and synchronizes repositories |
| `database/projects.json` | Stores project records |
| `.env` | Stores environment configuration and secrets |

---

## 7. API Endpoints

GitProHub API provides endpoints for checking API status, connecting to GitHub, retrieving project records, verifying repositories, submitting projects, registering projects and scanning repositories.

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | API status and endpoint information |
| `/api/github` | GET | GitHub connection status |
| `/api/projects` | GET | Retrieve all registered projects |
| `/api/projects/:id` | GET | Retrieve a project using its ID |
| `/api/verify/:owner/:repository` | GET | Verify a GitHub repository |
| `/api/submit` | POST | Submit or update a repository |
| `/api/register` | POST | Authorized repository registration |
| `/api/scan` | POST | Manually trigger repository scanning |

---

## 8. Core Services

### 8.1 Validator Service

**File:** `src/services/validator.js`

The validator is responsible for reading and checking the `gitprohub.md` metadata file.

It ensures that the metadata follows the GitProHub protocol and contains the required information.

Responsibilities:

- Parse the metadata file.
- Validate protocol information.
- Check required fields.
- Validate project ID.
- Validate owner and repository names.
- Validate repository URL consistency.
- Reject invalid metadata.

### 8.2 GitHub Service

**File:** `src/services/github.js`

The GitHub service communicates with GitHub and retrieves repository-related information.

Responsibilities:

- Communicate with the GitHub API.
- Authenticate using the configured GitHub token.
- Retrieve repository information.
- Retrieve latest commits.
- Fetch `gitprohub.md`.
- Handle HTTP errors.
- Handle network failures.
- Retry selected temporary failures.
- Apply request timeouts.

The service includes retry handling for selected temporary network and GitHub API errors.

### 8.3 Scanner Service

**File:** `src/services/scanner.js`

The scanner is responsible for discovering and checking repositories and synchronizing eligible projects with the database.

Responsibilities:

- Scan repositories belonging to Haproven.
- Scan registered external repositories.
- Check repository eligibility.
- Skip forks and archived repositories where applicable.
- Skip empty repositories.
- Validate metadata.
- Add new project records.
- Update existing project records.
- Remove records when metadata is confirmed to be missing.
- Preserve existing records when temporary errors occur.
- Prevent overlapping scanner execution.
- Save database changes safely.
- Generate scan statistics.
- Return detailed per-repository scan results.

### 8.4 Register Service

**File:** `src/routes/register.js`

The registration endpoint allows authorized requests to register or update project information.

Responsibilities:

- Authenticate requests using a Bearer token.
- Validate owner, repository and commit.
- Validate commit SHA.
- Fetch metadata from the specified commit.
- Validate metadata.
- Register or update project records.

### 8.5 Submit Service

**File:** `src/routes/submit.js`

The submission endpoint allows repositories to submit themselves to GitProHub.

Responsibilities:

- Accept repository owner and name.
- Validate request input.
- Retrieve repository information.
- Reject private repositories.
- Reject archived repositories.
- Retrieve latest commit.
- Fetch `gitprohub.md`.
- Validate metadata.
- Add or update project records.
- Prevent duplicate records.

The `/api/submit` endpoint is currently public and does not require Bearer-token authorization.

### 8.6 Projects Service

**File:** `src/routes/projects.js`

The projects service provides access to registered project records.

Responsibilities:

- Retrieve all registered projects.
- Retrieve an individual project by ID.
- Support case-insensitive project ID lookup.
- Return appropriate responses when a project is unavailable.

### 8.7 Verify Service

**File:** `src/routes/verify.js`

The verification service checks whether a GitHub repository exists in the GitProHub database.

Responsibilities:

- Verify repositories using owner and repository name.
- Match repository details case-insensitively.
- Return verification status.
- Return project information for verified repositories.
- Handle unknown repositories.

---

## 9. Automated Repository Scanning

GitProHub API includes an automated scanner that checks repositories and synchronizes eligible project records.

### Scan schedule

- Initial scan when the server starts.
- Automatic scan every 5 minutes.
- Authorized manual scan through `POST /api/scan`.

### What happens during a scan?

1. The scanner retrieves repository information.
2. It checks whether repositories are eligible.
3. It skips forks and archived repositories where applicable.
4. It checks for empty repositories.
5. It retrieves the metadata file.
6. It validates the metadata.
7. It adds new projects when eligible.
8. It updates existing project records.
9. It removes records when metadata is confirmed missing.
10. It records skipped repositories and their reasons.
11. It returns scan statistics and detailed results.

### Repository handling

| Condition | Scanner behavior |
|---|---|
| Valid metadata | Add or update project |
| Invalid protocol | Skip repository |
| Missing metadata with no registered record | Skip repository |
| Missing metadata for a registered project | Remove record after confirmed missing metadata |
| Fork repository | Skip repository |
| Empty repository | Skip repository |
| Archived repository | Skip where applicable |
| Temporary GitHub error | Preserve record and handle error |
| Duplicate project | Update existing record instead of duplicating |

### Scan statistics

| Field | Description |
|---|---|
| `success` | Indicates scan completion status |
| `scanned` | Total repositories considered by the scan |
| `added` | Newly added project records |
| `updated` | Updated project records |
| `removed` | Removed project records |
| `skipped` | Repositories skipped during the scan |
| `details` | Per-repository scan status and reasons |

---

## 10. Database Management

GitProHub API uses a JSON-based database to store verified project records.

### Database location

`database/projects.json`

### Database purpose

The database stores project information that is used by the API for project retrieval, repository verification and scanner synchronization.

Typical project information includes:

- Project ID.
- Project name.
- GitHub owner.
- Repository name.
- Description.
- Repository URL.
- Commit SHA.
- Verification status.
- Registration information.
- Update information.

### Database operations

- Add new projects.
- Update existing project records.
- Prevent duplicate repository records.
- Retrieve stored projects.
- Remove project records when metadata is confirmed missing.

### Database integrity

The scanner uses safe database-writing logic to reduce the risk of incomplete writes during database synchronization.

Database verification and additional recovery testing remain part of future testing.

---

## 11. Security

GitProHub API includes security and validation measures to protect API operations.

### Implemented security features

- Bearer-token authorization for `/api/register`.
- Bearer-token authorization for `/api/scan`.
- GitHub token stored in environment variables.
- Request input validation.
- Commit SHA validation.
- Repository owner and name validation.
- Metadata validation.
- Private repository rejection in the submission flow.
- Archived repository rejection in the submission flow.
- Protected manual scanning.
- Scanner execution lock.

### Public endpoint

`POST /api/submit` is currently public and does not require a Bearer token.

Public submissions are validated before database registration.

---

## 12. Testing & Verification Record

Testing was performed using local HTTP requests, PowerShell and the local development API.

The tests covered API endpoints, repository registration, submission, metadata validation, project retrieval, repository verification and scanning.

### Test 1 — API Homepage

**Endpoint:** `GET /`

**Test:** Retrieve API status and endpoint information.

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

**Observed project count during the recorded test:** 6

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

**Test:** Scanner request with a valid API token.

**Result:** PASS

Verified:

- Authorized scan execution.
- Repository scanning.
- Metadata updates.
- Scan statistics.

**Observed scan result during the earlier test:**

| Field | Result |
|---|---:|
| Success | True |
| Scanned | 24 |
| Added | 0 |
| Updated | 6 |
| Removed | 0 |
| Skipped | 12 |

This is a historical scan result and is separate from the latest scan.

### Test 15 — Repository Submission

**Endpoint:** `POST /api/submit`

**Test:** Submit an external GitHub repository.

**Result:** PASS

Verified:

- External repository submission.
- GitHub repository information retrieval.
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

**Test:** Remove `gitprohub.md` and run the scanner.

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

**API:** https://gitprohub-api.onrender.com

**Result:** PASS

Verified:

- Live API response.
- Deployment availability.
- Repository removal reflected in live project data.

### Test 23 — Empty Repository Detection

**Endpoint:** `POST /api/scan`

**Test:** Authorized manual scan after implementing empty repository detection.

**Result:** PASS

**Observed scan result:**

| Field | Result |
|---|---:|
| Success | True |
| Scanned | 24 |
| Added | 0 |
| Updated | 7 |
| Removed | 0 |
| Skipped | 17 |

Verified:

- Authorized manual scan execution.
- Empty repositories identified and skipped.
- Empty repository handling using repository size and default branch checks.
- Empty repositories reported as `Empty repository (no commits)`.
- Invalid protocol repositories skipped.
- Fork repositories skipped.
- Missing metadata repositories skipped.
- Valid project metadata synchronized.
- Detailed per-repository scan results returned.
- Scan statistics returned successfully.

**Observed empty repositories during this scan:**

- `haproAPI`
- `haprofun`
- `Haproven-Team-Hub`
- `pro-kusagara-01`
- `pro-susheel-01`
- `ramnideepdham-mandir`

**Verified scan result:** 7 updated, 17 skipped, 0 added, 0 removed.

---

## 13. Latest Scan Analysis

The latest manual scan was successfully executed on the local development server.

The scanner processed 24 repositories and returned detailed information about each repository.

### Latest observed statistics

| Metric | Result |
|---|---:|
| Scan status | Successful |
| Repositories scanned | 24 |
| Projects added | 0 |
| Projects updated | 7 |
| Projects removed | 0 |
| Repositories skipped | 17 |

### Updated repositories

The following repositories were successfully synchronized during the latest scan:

- `haproven/gitprohub-api`
- `haproven/gitprohub-test`
- `haproven/HaproID`
- `haproven/haproven`
- `haproven/vishnupur-smr`
- `codersusheel/gitprohub-submit-test`
- `codersusheel/Codersusheel`

### Skip reasons observed

The scanner returned several skip reasons:

- Invalid protocol.
- Fork repository.
- Empty repository (no commits).
- `gitprohub.md` missing; no registered record.

The detailed scan response confirms that repositories were individually categorized rather than simply counted.

---

## 14. Testing Summary

| Testing Category | Status |
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
| Empty repository detection | PASS |
| Fork repository handling | PASS |
| Invalid protocol handling | PASS |
| Detailed scan reporting | PASS |

**Overall testing status:** All recorded tests passed during their respective testing sessions. Additional tests may be required after future changes.

---

## 15. Deployment & Local Development

### Requirements

- Node.js.
- npm.
- GitHub account.
- GitHub API token configured in the environment.

### Local installation

Clone the repository:

```bash
git clone https://github.com/haproven/gitprohub-api.git
```

Navigate to the project directory:

```bash
cd gitprohub-api
```

Install dependencies:

```bash
npm install
```

Configure environment variables in `.env`.

Start the server:

```bash
npm start
```

### Local server

`http://localhost:3000`

### Live deployment

https://gitprohub-api.onrender.com

---

## 16. Future Testing & Improvements

The following areas may be tested or improved in future development:

- GitHub API rate-limit handling.
- GitHub API quota recovery.
- Network timeout recovery.
- Invalid JSON metadata.
- Missing individual metadata fields.
- Private repository rejection.
- Archived repository rejection.
- Fork repository handling.
- Concurrent submissions.
- Database corruption recovery.
- Database write failure.
- Scanner recovery after temporary GitHub errors.
- Render restart and persistence.
- Scan history.
- Database consistency verification.
- Automated test suite using Node.js test runner.
- Database backup and recovery.

---

## 17. Project Status

**Project:** GitProHub API  
**Version:** 1.3.0  
**Organization:** Haproven  
**Repository:** https://github.com/haproven/gitprohub-api  
**Live API:** https://gitprohub-api.onrender.com

GitProHub API is operational in the local development environment and deployed to the live API environment.

Recorded testing has covered API endpoints, GitHub connectivity, project retrieval, repository verification, registration, submission, duplicate prevention, metadata synchronization, missing metadata removal, repository scanning, empty repository detection and detailed scan reporting.

The project continues to undergo development, testing and improvements to ensure reliable repository verification and project synchronization within the GitProHub ecosystem.
