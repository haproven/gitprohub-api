const FIELD_ALIASES = {
    protocol: ["protocol", "gitprohub protocol", "format"],
    id: ["id", "project id", "project identifier"],
    name: ["name", "project name", "title"],
    owner: ["owner", "github owner", "github username", "username", "author"],
    repository: [
        "repository",
        "repo",
        "repository url",
        "repo url",
        "github repository",
        "github repo",
        "github url"
    ]
};

const ALIAS_MAP = {};

for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
        ALIAS_MAP[normalizeKey(alias)] = canonical;
    }
}

function normalizeKey(key) {
    return String(key)
        .replace(/[*`_]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function cleanValue(value) {
    let result = String(value ?? "").trim();

    // Remove only surrounding quotes
    result = result.replace(/^["'](.*)["']$/, "$1").trim();

    // Remove surrounding Markdown inline formatting without altering inner characters
    result = result.replace(/^(\*\*|__)(.*)\1$/, "$2").trim();
    result = result.replace(/^(\*|_)(.*)\1$/, "$2").trim();
    result = result.replace(/^`(.*)`$/, "$1").trim();

    return result;
}

function parseFile(content) {
    if (typeof content !== "string" || !content.trim()) {
        throw new Error("gitprohub.md is empty");
    }

    const data = {};

    function assign(key, value) {
        const normalized = ALIAS_MAP[normalizeKey(key)];
        const cleaned = cleanValue(value);

        if (normalized && cleaned && !data[normalized]) {
            data[normalized] = cleaned;
        }
    }

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line || /^---+$/.test(line) || /^#+\s/.test(line)) {
            continue;
        }

        // Markdown table: | Protocol | GitProHub |
        if (line.includes("|")) {
            const cells = line
                .split("|")
                .map(cell => cell.trim())
                .filter(Boolean);

            if (
                cells.length >= 2 &&
                !cells.every(cell => /^:?-{2,}:?$/.test(cell))
            ) {
                assign(cells[0], cells.slice(1).join(" "));
            }
        }

        // Markdown, bullet or YAML-style key: value
        const match = line.match(
            /^(?:[-+]\s*)?(?:\*\*)?([^:]+?)(?:\*\*)?\s*:\s*(.*)$/
        );

        if (match) {
            assign(match[1], match[2]);
        }
    }

    return data;
}

// Validate Metadata
function validateProject(data, owner, repo) {
    // Protocol
    if (!/^gitprohub(?:\s+v?\d+(?:\.\d+)*)?$/i.test(data.protocol || "")) {
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
        let repository = data.repository.trim();

        if (!/^https?:\/\//i.test(repository)) {
            repository = `https://${repository}`;
        }

        const repoURL = new URL(repository);

        if (
            repoURL.hostname.toLowerCase() !== "github.com" ||
            repoURL.pathname.replace(/\/+$/, "").toLowerCase() !==
                `/${owner}/${repo}`.toLowerCase()
        ) {
            throw new Error("Repository mismatch");
        }

        data.repository = `https://github.com/${owner}/${repo}`;
    } catch {
        throw new Error("Invalid repository URL");
    }

    return data;
}

module.exports = { parseFile, validateProject };