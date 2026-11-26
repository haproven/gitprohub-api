

const GITHUB_TOKEN = process.env.GITPROHUB_TOKEN;

async function githubRequest(url) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }

    return response.json();
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

// Get latest commit
async function getLatestCommit(owner, repo, branch) {
    const data = await githubRequest(
        `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`
    );

    return data.sha;
}

// Fetch gitprohub.md
async function getGitProHubFile(owner, repo, commit) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/gitprohub.md`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("gitprohub.md not found");
    }

    return await response.text();
}

module.exports = {
    getGitProHubFile,
    getRepositories,
    getRepositoryInfo,
    getLatestCommit
};