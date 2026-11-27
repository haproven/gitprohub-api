
const fs = require("fs");
const path = require("path");

const {
    getRepositories,
    getRepositoryInfo,
    getLatestCommit,
    getGitProHubFile,
    discoverGitProHubRepositories
} = require("./github");

const { parseFile, validateProject } = require("./validator");

const DB = path.join(__dirname, "../../database/projects.json");
const ACCOUNTS_DB = path.join(__dirname, "../../database/accounts.json");

let isScanning = false;

// Discovery cadence: 6 hours
const DISCOVERY_INTERVAL = 6 * 60 * 60 * 1000;
let lastDiscoveryAt = 0;

// Read enabled accounts from independent registry
function readAccounts() {
    if (!fs.existsSync(ACCOUNTS_DB)) {
        throw new Error("Account registry file is missing");
    }

    const data = JSON.parse(fs.readFileSync(ACCOUNTS_DB, "utf8"));

    if (!Array.isArray(data)) {
        throw new Error("Account registry must contain an array");
    }

    const owners = [
        ...new Set(
            data
                .filter(account =>
                    account &&
                    account.enabled === true &&
                    typeof account.owner === "string" &&
                    /^[a-zA-Z0-9-]+$/.test(account.owner.trim())
                )
                .map(account => account.owner.trim().toLowerCase())
                .filter(Boolean)
        )
    ];

    return owners;
}

// Recover missing accounts from registered project owners
function recoverAccountsFromProjects(projects) {
    if (!fs.existsSync(ACCOUNTS_DB)) {
        throw new Error("Account registry file is missing");
    }

    const data = JSON.parse(fs.readFileSync(ACCOUNTS_DB, "utf8"));

    if (!Array.isArray(data)) {
        throw new Error("Account registry must contain an array");
    }

    const existingOwners = new Set(
        data
            .filter(account => account && typeof account.owner === "string")
            .map(account => account.owner.trim().toLowerCase())
            .filter(Boolean)
    );

    const recovered = [];

    for (const project of projects) {
        const projectOwner = project?.owner?.trim().toLowerCase();

        if (
            !projectOwner ||
            !/^[a-zA-Z0-9-]+$/.test(projectOwner) ||
            existingOwners.has(projectOwner)
        ) {
            continue;
        }

        data.push({
            owner: projectOwner,
            enabled: true,
            source: "recovered",
            addedAt: new Date().toISOString()
        });

        existingOwners.add(projectOwner);
        recovered.push(projectOwner);
    }

    if (!recovered.length) {
        return [];
    }

    const tempFile = `${ACCOUNTS_DB}.${process.pid}.tmp`;
    let fd;

    try {
        fd = fs.openSync(tempFile, "w");
        fs.writeFileSync(fd, JSON.stringify(data, null, 2), "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;

        fs.renameSync(tempFile, ACCOUNTS_DB);

    } catch (error) {
        if (fd !== undefined) {
            fs.closeSync(fd);
        }

        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        throw error;
    }

    console.log("Recovered accounts:", recovered);

    return recovered;
}

// Register newly discovered owners without modifying existing records
function registerDiscoveredAccounts(candidates) {
    if (!fs.existsSync(ACCOUNTS_DB)) {
        throw new Error("Account registry file is missing");
    }

    const data = JSON.parse(fs.readFileSync(ACCOUNTS_DB, "utf8"));

    if (!Array.isArray(data)) {
        throw new Error("Account registry must contain an array");
    }

    const existingOwners = new Set(
        data
            .filter(account => account && typeof account.owner === "string")
            .map(account => account.owner.trim().toLowerCase())
            .filter(Boolean)
    );

    const discovered = [];

    for (const candidate of candidates) {
        const candidateOwner = typeof candidate?.owner === "string" ? candidate.owner.trim().toLowerCase() : "";

        if (
            !candidateOwner ||
            !/^[a-zA-Z0-9-]+$/.test(candidateOwner) ||
            existingOwners.has(candidateOwner)
        ) {
            continue;
        }

        data.push({
            owner: candidateOwner,
            enabled: true,
            source: "discovered",
            addedAt: new Date().toISOString()
        });

        existingOwners.add(candidateOwner);
        discovered.push(candidateOwner);
    }

    if (!discovered.length) {
        return [];
    }

    const tempFile = `${ACCOUNTS_DB}.${process.pid}.tmp`;
    let fd;

    try {
        fd = fs.openSync(tempFile, "w");
        fs.writeFileSync(fd, JSON.stringify(data, null, 2), "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;

        fs.renameSync(tempFile, ACCOUNTS_DB);

    } catch (error) {
        if (fd !== undefined) {
            fs.closeSync(fd);
        }

        if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
        }

        throw error;
    }

    console.log("Discovered accounts registered:", discovered);

    return discovered;
}
// Read project database
function readDB() {
    if (!fs.existsSync(DB)) {
        fs.writeFileSync(DB, "[]");
    }

    const data = JSON.parse(fs.readFileSync(DB, "utf8") || "[]");

    if (!Array.isArray(data)) {
        throw new Error("Invalid database format");
    }

    return data;
}

// Atomic database write
function saveDB(data) {
    const tempDB = `${DB}.${process.pid}.tmp`;
    let fd;

    try {
        const content = JSON.stringify(data, null, 2);

        fd = fs.openSync(tempDB, "w");
        fs.writeFileSync(fd, content, "utf8");
        fs.fsyncSync(fd);
        fs.closeSync(fd);
        fd = undefined;

        fs.renameSync(tempDB, DB);

    } catch (error) {
        if (fd !== undefined) {
            fs.closeSync(fd);
        }

        if (fs.existsSync(tempDB)) {
            fs.unlinkSync(tempDB);
        }

        throw error;
    }
}

// Scan and update one repository
async function scanSingleRepository(owner, repoName, branch, repoURL, projects) {
    if (!branch) {
        throw new Error("Empty repository (no commits)");
    }

    const commit = await getLatestCommit(owner, repoName, branch);

    const content = await getGitProHubFile(owner, repoName, commit);

    const metadata = parseFile(content);

    validateProject(metadata, owner, repoName);

    const index = projects.findIndex(
        p =>
            p.owner?.toLowerCase() === owner.toLowerCase() &&
            p.repository?.toLowerCase() === repoName.toLowerCase()
    );

    const project = {
        ...(index >= 0 ? projects[index] : {}),
        ...metadata,
        owner,
        repository: repoName,
        commit,
        url: repoURL || `https://github.com/${owner}/${repoName}`,
        status: "verified",
        updatedAt: new Date().toISOString()
    };

    if (index >= 0) {
        projects[index] = project;
        return "updated";
    }

    projects.push(project);
    return "added";
}

// Main Scanner
async function scanRepositories(owner) {
    if (isScanning) {
        console.log("Scan skipped: another scan is already in progress");

        return {
            success: false,
            message: "Another scan is already in progress",
            scanned: 0,
            added: 0,
            updated: 0,
            removed: 0,
            skipped: 0,
            details: []
        };
    }

    isScanning = true;

    try {
        const projects = readDB();

        // Recover missing accounts before starting scan
        recoverAccountsFromProjects(projects);

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let removed = 0;

        let scanned = 0;

        const details = [];
        const scannedRepositories = new Set();

        // Discover GitProHub repositories every 6 hours
        if (Date.now() - lastDiscoveryAt >= DISCOVERY_INTERVAL) {
            lastDiscoveryAt = Date.now();

            try {
                const candidates = await discoverGitProHubRepositories(20);
                const newlyRegistered = registerDiscoveredAccounts(candidates);

                console.log(
                    `Discovery completed: ${candidates.length} root repositories found, ${newlyRegistered.length} new accounts registered`
                );
            } catch (error) {
                console.log(`Discovery failed: ${error.message}`);
            }
        }

        // Read independent account registry
        const accounts = readAccounts();

        // Fallback to requested owner if registry is empty
        const scanOwners = accounts.length
            ? accounts
            : [owner];

        console.log("Accounts scheduled for scan:", scanOwners);

        // Scan repositories from registered GitHub accounts
        for (const scanOwner of scanOwners) {
            let repositories;

            try {
                repositories = await getRepositories(scanOwner);
            } catch (error) {
                skipped++;

                details.push({
                    owner: scanOwner,
                    repository: null,
                    status: "skipped",
                    reason: `Account scan failed: ${error.message}`
                });

                console.log(
                    `Account scan failed for ${scanOwner}: ${error.message}`
                );

                continue;
            }

            for (const repo of repositories) {
                const key = `${scanOwner}/${repo.name}`.toLowerCase();

                // Avoid duplicate repository scans
                if (scannedRepositories.has(key)) {
                    continue;
                }

                scannedRepositories.add(key);
                scanned++;

                // Empty repository detection
                if (repo.size === 0 || !repo.default_branch) {
                    skipped++;

                    details.push({
                        owner: scanOwner,
                        repository: repo.name,
                        status: "skipped",
                        reason: "Empty repository (no commits)"
                    });

                    continue;
                }

                // Skip forks and archived repositories
                if (repo.fork || repo.archived) {
                    skipped++;

                    const reason = repo.fork
                        ? "Fork repository"
                        : "Archived repository";

                    details.push({
                        owner: scanOwner,
                        repository: repo.name,
                        status: "skipped",
                        reason
                    });

                    continue;
                }

                try {
                    const result = await scanSingleRepository(
                        scanOwner,
                        repo.name,
                        repo.default_branch,
                        repo.html_url,
                        projects
                    );

                    if (result === "added") {
                        added++;

                        details.push({
                            owner: scanOwner,
                            repository: repo.name,
                            status: "added",
                            reason: "New verified project"
                        });
                    }

                    if (result === "updated") {
                        updated++;

                        details.push({
                            owner: scanOwner,
                            repository: repo.name,
                            status: "updated",
                            reason: "Metadata synchronized"
                        });
                    }

                } catch (error) {
                    // PROTECTION: Never remove projects automatically
                    if (error.message === "gitprohub.md not found") {
                        skipped++;

                        details.push({
                            owner: scanOwner,
                            repository: repo.name,
                            status: "skipped",
                            reason: "gitprohub.md missing; removal protected"
                        });

                        console.log(
                            `Protected ${scanOwner}/${repo.name}: gitprohub.md missing; record retained`
                        );

                    } else {
                        skipped++;

                        details.push({
                            owner: scanOwner,
                            repository: repo.name,
                            status: "skipped",
                            reason: error.message
                        });

                        console.log(
                            `Skipped ${scanOwner}/${repo.name}: ${error.message}`
                        );
                    }
                }
            }
        }

        // Scan registered external repositories
        const registeredRepositories = [...projects];

        for (const project of registeredRepositories) {
            if (!project.owner || !project.repository) {
                skipped++;

                details.push({
                    owner: project.owner || null,
                    repository: project.repository || null,
                    status: "skipped",
                    reason: "Invalid registered repository record"
                });

                continue;
            }

            const externalOwner = project.owner;
            const repoName = project.repository;

            const key = `${externalOwner}/${repoName}`.toLowerCase();

            // Avoid rescanning repositories already scanned above
            if (scannedRepositories.has(key)) {
                continue;
            }

            scannedRepositories.add(key);
            scanned++;

            try {
                const repoInfo = await getRepositoryInfo(
                    externalOwner,
                    repoName
                );

                // Empty repository detection
                if (repoInfo.size === 0 || !repoInfo.default_branch) {
                    skipped++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "skipped",
                        reason: "Empty repository (no commits)"
                    });

                    continue;
                }

                // Skip forks, archived and private repositories
                if (repoInfo.fork || repoInfo.archived || repoInfo.private) {
                    skipped++;

                    const reason = repoInfo.fork
                        ? "Fork repository"
                        : repoInfo.archived
                            ? "Archived repository"
                            : "Private repository";

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "skipped",
                        reason
                    });

                    continue;
                }

                const result = await scanSingleRepository(
                    externalOwner,
                    repoName,
                    repoInfo.default_branch,
                    repoInfo.html_url,
                    projects
                );

                if (result === "added") {
                    added++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "added",
                        reason: "New verified project"
                    });
                }

                if (result === "updated") {
                    updated++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "updated",
                        reason: "Metadata synchronized"
                    });
                }

            } catch (error) {
                // PROTECTION: Retain existing registered record
                if (error.message === "gitprohub.md not found") {
                    skipped++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "skipped",
                        reason: "gitprohub.md missing; removal protected"
                    });

                    console.log(
                        `Protected ${externalOwner}/${repoName}: gitprohub.md missing; record retained`
                    );

                } else {
                    skipped++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "skipped",
                        reason: error.message
                    });

                    console.log(
                        `Skipped registered repository ${externalOwner}/${repoName}: ${error.message}`
                    );
                }
            }
        }

        // Save database safely
        saveDB(projects);

        console.log("Scan completed:", {
            scanned,
            added,
            updated,
            removed,
            skipped
        });

        return {
            success: true,
            scanned,
            added,
            updated,
            removed,
            skipped,
            details
        };

    } finally {
        isScanning = false;
    }
}

module.exports = { scanRepositories };





