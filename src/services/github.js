
async function getGitProHubFile(owner, repo, commit) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/gitprohub.md`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("gitprohub.md not found");
    }

    return await response.text();
}

module.exports = { getGitProHubFile };
