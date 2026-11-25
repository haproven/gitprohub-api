const fs = require("fs");
const path = require("path");

const {
    getRepositories,
    getLatestCommit,
    getGitProHubFile
} = require("./github");

const { parseFile, validateProject } = require("./validator");

const DB = path.join(__dirname, "../../database/projects.json");

function readDB() {
    if (!fs.existsSync(DB)) {
        fs.writeFileSync(DB, "[]");
    }

    return JSON.parse(fs.readFileSync(DB, "utf8") || "[]");
}

function saveDB(data) {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

async function scanRepositories(owner) {
    const repositories = await getRepositories(owner);
    const projects = readDB();

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const repo of repositories) {
        try {
            if (repo.fork || repo.archived) {
                skipped++;
                continue;
            }

            const commit = await getLatestCommit(
                owner,
                repo.name,
                repo.default_branch
            );

            const content = await getGitProHubFile(
                owner,
                repo.name,
                commit
            );

            const metadata = parseFile(content);
            validateProject(metadata, owner, repo.name);

            const index = projects.findIndex(
                p =>
                    p.owner?.toLowerCase() === owner.toLowerCase() &&
                    p.repository?.toLowerCase() === repo.name.toLowerCase()
            );

            const project = {
                ...metadata,
                owner,
                repository: repo.name,
                commit,
                url: repo.html_url,
                status: "verified",
                updatedAt: new Date().toISOString()
            };

            if (index >= 0) {
                projects[index] = project;
                updated++;
            } else {
                projects.push(project);
                added++;
            }

        } catch (error) {
            skipped++;
        }
    }

    saveDB(projects);

    return {
        success: true,
        scanned: repositories.length,
        added,
        updated,
        skipped
    };
}

module.exports = { scanRepositories };