
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

function saveDB(data) {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
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
    const projects = readDB();

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let removed = 0;
    let scanned = 0;

    const scannedRepositories = new Set();

    // Scan owner's repositories
    const repositories = await getRepositories(owner);

    for (const repo of repositories) {
        const key = `${owner}/${repo.name}`.toLowerCase();

        scannedRepositories.add(key);
        scanned++;

        try {
            if (repo.fork || repo.archived) {
                skipped++;
                continue;
            }

            const result = await scanSingleRepository(
                owner,
                repo.name,
                repo.default_branch,
                repo.html_url,
                projects
            );

            if (result === "added") added++;
            if (result === "updated") updated++;

        } catch (error) {
            if (error.message === "gitprohub.md not found") {
                if (removeProject(owner, repo.name, projects)) {
                    removed++;
                    console.log(`Removed ${owner}/${repo.name}: gitprohub.md missing`);
                }
            } else {
                skipped++;
                console.log(`Skipped ${owner}/${repo.name}: ${error.message}`);
            }
        }
    }

    // Scan registered external repositories
    const registeredRepositories = [...projects];

    for (const project of registeredRepositories) {
        try {
            if (!project.owner || !project.repository) {
                skipped++;
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

            const repoInfo = await getRepositoryInfo(
                externalOwner,
                repoName
            );

            if (repoInfo.fork || repoInfo.archived || repoInfo.private) {
                skipped++;
                continue;
            }

            const result = await scanSingleRepository(
                externalOwner,
                repoName,
                repoInfo.default_branch,
                repoInfo.html_url,
                projects
            );

            if (result === "added") added++;
            if (result === "updated") updated++;

        } catch (error) {
            if (error.message === "gitprohub.md not found") {
                if (removeProject(project.owner, project.repository, projects)) {
                    removed++;
                    console.log(
                        `Removed ${project.owner}/${project.repository}: gitprohub.md missing`
                    );
                }
            } else {
                skipped++;
                console.log(
                    `Skipped registered repository ${project.owner}/${project.repository}: ${error.message}`
                );
            }
        }
    }

    saveDB(projects);

    return {
        success: true,
        scanned,
        added,
        updated,
        removed,
        skipped
    };
}

module.exports = { scanRepositories };
