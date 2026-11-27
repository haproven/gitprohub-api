
const fs = require("fs");
const path = require("path");

const {
    getRepositories,
    getRepositoryInfo,
    getLatestCommit,
    getGitProHubFile
} = require("./github");

const { parseFile, validateProject } = require("./validator");

const DB = path.join(__dirname, "../../database/projects.json");

let isScanning = false;

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

function removeProject(owner, repoName, projects) {
    const index = projects.findIndex(
        p =>
            p.owner?.toLowerCase() === owner.toLowerCase() &&
            p.repository?.toLowerCase() === repoName.toLowerCase()
    );

    if (index === -1) {
        return false;
    }

    projects.splice(index, 1);
    return true;
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

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let removed = 0;
        let scanned = 0;

        const details = [];
        const scannedRepositories = new Set();

        // Scan owner's repositories
        const repositories = await getRepositories(owner);

        for (const repo of repositories) {
            const key = `${owner}/${repo.name}`.toLowerCase();

            scannedRepositories.add(key);
            scanned++;

            // Empty repository detection
            if (!repo.default_branch) {
                skipped++;

                details.push({
                    owner,
                    repository: repo.name,
                    status: "skipped",
                    reason: "Empty repository (no commits)"
                });

                continue;
            }

            if (repo.fork || repo.archived) {
                skipped++;

                const reason = repo.fork
                    ? "Fork repository"
                    : "Archived repository";

                details.push({
                    owner,
                    repository: repo.name,
                    status: "skipped",
                    reason
                });

                continue;
            }

            try {
                const result = await scanSingleRepository(
                    owner,
                    repo.name,
                    repo.default_branch,
                    repo.html_url,
                    projects
                );

                if (result === "added") {
                    added++;

                    details.push({
                        owner,
                        repository: repo.name,
                        status: "added",
                        reason: "New verified project"
                    });
                }

                if (result === "updated") {
                    updated++;

                    details.push({
                        owner,
                        repository: repo.name,
                        status: "updated",
                        reason: "Metadata synchronized"
                    });
                }

            } catch (error) {
                if (error.message === "gitprohub.md not found") {
                    if (removeProject(owner, repo.name, projects)) {
                        removed++;

                        details.push({
                            owner,
                            repository: repo.name,
                            status: "removed",
                            reason: "gitprohub.md missing"
                        });

                        console.log(
                            `Removed ${owner}/${repo.name}: gitprohub.md missing`
                        );
                    } else {
                        skipped++;

                        details.push({
                            owner,
                            repository: repo.name,
                            status: "skipped",
                            reason: "gitprohub.md missing; no registered record"
                        });
                    }
                } else {
                    skipped++;

                    details.push({
                        owner,
                        repository: repo.name,
                        status: "skipped",
                        reason: error.message
                    });

                    console.log(
                        `Skipped ${owner}/${repo.name}: ${error.message}`
                    );
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
                if (!repoInfo.default_branch) {
                    skipped++;

                    details.push({
                        owner: externalOwner,
                        repository: repoName,
                        status: "skipped",
                        reason: "Empty repository (no commits)"
                    });

                    continue;
                }

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
                if (error.message === "gitprohub.md not found") {
                    if (removeProject(project.owner, project.repository, projects)) {
                        removed++;

                        details.push({
                            owner: externalOwner,
                            repository: repoName,
                            status: "removed",
                            reason: "gitprohub.md missing"
                        });

                        console.log(
                            `Removed ${externalOwner}/${repoName}: gitprohub.md missing`
                        );
                    } else {
                        skipped++;

                        details.push({
                            owner: externalOwner,
                            repository: repoName,
                            status: "skipped",
                            reason: "gitprohub.md missing; no registered record"
                        });
                    }
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




