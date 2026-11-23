
function parseFile(content) {
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("gitprohub.md is empty");
    }

    const data = {};

    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);

        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();

            data[key] = value;
        }
    });

    return data;
}

// Validate Metadata
function validateProject(data, owner, repo) {
    // Protocol
    if (data.protocol !== "GitProHub") {
        throw new Error("Invalid protocol");
    }

    // Required fields
    const required = ["id", "name", "owner", "repository"];

    for (const field of required) {
        if (!data[field]) {
            throw new Error(`Required field missing: ${field}`);
        }
    }

    // ID validation
    if (!/^[a-zA-Z0-9_-]+$/.test(data.id)) {
        throw new Error("Invalid project ID");
    }

    // Owner validation
    if (data.owner.toLowerCase() !== owner.toLowerCase()) {
        throw new Error("Owner mismatch");
    }

    // Repository URL validation
    try {
        const repoURL = new URL(data.repository);

        if (
            repoURL.hostname !== "github.com" ||
            repoURL.pathname.replace(/\/+$/, "").toLowerCase() !==
                `/${owner}/${repo}`.toLowerCase()
        ) {
            throw new Error("Repository mismatch");
        }
    } catch {
        throw new Error("Invalid repository URL");
    }

    return data;
}

module.exports = { parseFile, validateProject };
