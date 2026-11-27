
const GITHUB_TOKEN = process.env.GITPROHUB_TOKEN;

const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 15000;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error) {
    return (
        error.name === "AbortError" ||
        error.name === "TimeoutError" ||
        error.name === "TypeError"
    );
}

// GitHub API request with retry and timeout
async function githubRequest(url) {
    if (!GITHUB_TOKEN) {
        throw new Error("GitHub token is missing");
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28"
                },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT)
            });

            if (response.ok) {
                return await response.json();
            }

            const status = response.status;

            const rateLimited =
                status === 429 ||
                (status === 403 &&
                    response.headers.get("x-ratelimit-remaining") === "0");

            const retryable =
                rateLimited ||
                status === 500 ||
                status === 502 ||
                status === 503 ||
                status === 504;

            if (!retryable || attempt === MAX_RETRIES) {
                throw new Error(`GitHub API error: ${status}`);
            }

            let delay = 1000 * Math.pow(2, attempt);

            if (rateLimited) {
                const retryAfter = response.headers.get("retry-after");
                const reset = response.headers.get("x-ratelimit-reset");

                if (retryAfter) {
                    delay = Math.min(Number(retryAfter) * 1000, 30000);
                } else if (reset) {
                    delay = Math.min(
                        Math.max(Number(reset) * 1000 - Date.now(), 1000),
                        30000
                    );
                } else {
                    delay = 10000;
                }
            }

            console.log(
                `GitHub API retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${status})`
            );

            await wait(delay);

        } catch (error) {
            if (
                error.message.startsWith("GitHub API error:") ||
                error.message === "GitHub token is missing"
            ) {
                throw error;
            }

            if (
                !isRetryableNetworkError(error) ||
                attempt === MAX_RETRIES
            ) {
                throw error;
            }

            const delay = 1000 * Math.pow(2, attempt);

            console.log(
                `GitHub network retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`
            );

            await wait(delay);
        }
    }

    throw new Error("GitHub request failed");
}

// Fetch raw GitProHub metadata with retry
async function getGitProHubFile(owner, repo, commit) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/gitprohub.md`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT)
            });

            if (response.ok) {
                return await response.text();
            }

            if (response.status === 404) {
                throw new Error("gitprohub.md not found");
            }

            const retryable =
                response.status === 429 ||
                response.status === 500 ||
                response.status === 502 ||
                response.status === 503 ||
                response.status === 504;

            if (!retryable || attempt === MAX_RETRIES) {
                throw new Error(
                    `GitProHub file fetch error: ${response.status}`
                );
            }

            let delay = 1000 * Math.pow(2, attempt);

            if (response.status === 429) {
                const retryAfter = response.headers.get("retry-after");

                delay = retryAfter
                    ? Math.min(Number(retryAfter) * 1000, 30000)
                    : 10000;
            }

            console.log(
                `Metadata retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms (HTTP ${response.status})`
            );

            await wait(delay);

        } catch (error) {
            if (error.message === "gitprohub.md not found") {
                throw error;
            }

            if (
                error.message.startsWith("GitProHub file fetch error:") ||
                !isRetryableNetworkError(error) ||
                attempt === MAX_RETRIES
            ) {
                throw error;
            }

            const delay = 1000 * Math.pow(2, attempt);

            console.log(
                `Metadata network retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`
            );

            await wait(delay);
        }
    }

    throw new Error("GitProHub file fetch failed");
}

// Discover repositories containing gitprohub.md
async function discoverGitProHubRepositories(maxResults = 20) {
    const limit = Math.max(1, Math.min(Number(maxResults) || 20, 100));
    const repositories = [];
    const seen = new Set();

    let page = 1;

    while (repositories.length < limit) {
        const perPage = Math.min(30, limit - repositories.length);

        const query = encodeURIComponent("filename:gitprohub.md");

        const data = await githubRequest(
            `https://api.github.com/search/code?q=${query}&per_page=${perPage}&page=${page}`
        );

        if (!Array.isArray(data.items) || !data.items.length) {
            break;
        }

        for (const item of data.items) {
            const owner = item.repository?.owner?.login;
            const repo = item.repository?.name;
            const filePath = item.path;

            if (!owner || !repo || filePath !== "gitprohub.md") {
                continue;
            }

            const key = `${owner}/${repo}`.toLowerCase();

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);

            repositories.push({
                owner,
                repository: repo,
                path: filePath,
                url: item.html_url
            });

            if (repositories.length >= limit) {
                break;
            }
        }

        if (data.items.length < perPage) {
            break;
        }

        page++;
    }

    return repositories;
}
// Get repositories
async function getRepositories(owner) {
    let repositories = [];
    let page = 1;

    while (true) {
        const data = await githubRequest(
            `https://api.github.com/users/${owner}/repos?per_page=100&page=${page}`
        );

        if (!data.length) break;

        repositories.push(...data);
        page++;
    }

    return repositories;
}

// Get repository details
async function getRepositoryInfo(owner, repo) {
    return githubRequest(
        `https://api.github.com/repos/${owner}/${repo}`
    );
}

// Get latest commit with specific 409 handling
async function getLatestCommit(owner, repo, branch) {
    try {
        const data = await githubRequest(
            `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`
        );

        return data.sha;

    } catch (error) {
        if (error.message === "GitHub API error: 409") {
            throw new Error(
                "GitHub returned HTTP 409 while fetching latest commit (repository may be empty or in conflict)"
            );
        }

        throw error;
    }
}

module.exports = {
    discoverGitProHubRepositories,
    getGitProHubFile,
    getRepositories,
    getRepositoryInfo,
    getLatestCommit
};

