
const express = require("express");
const fs = require("fs");
const path = require("path");

const { getGitProHubFile } = require("../services/github");
const { parseFile, validateProject } = require("../services/validator");

const router = express.Router();

const DB = path.join(__dirname, "../../database/projects.json");

// Read Database
function readDB() {
    if (!fs.existsSync(DB)) {
        fs.writeFileSync(DB, "[]");
    }

    const data = fs.readFileSync(DB, "utf8");
    return JSON.parse(data || "[]");
}

// Save Database
function saveDB(data) {
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// Register Project
router.post("/", async (req, res) => {
    try {
        // Authorization
        const token = process.env.GITPROHUB_TOKEN;

        if (!token) {
            return res.status(500).json({
                success: false,
                message: "API token not configured"
            });
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || authHeader !== `Bearer ${token}`) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // Request Data
        const { owner, repository, commit } = req.body || {};

        if (!owner || !repository || !commit) {
            return res.status(400).json({
                success: false,
                message: "Owner, repository and commit required"
            });
        }

        // Validate Input
        if (
            !/^[a-zA-Z0-9-]+$/.test(owner) ||
            !/^[a-zA-Z0-9._-]+$/.test(repository) ||
            !/^[a-f0-9]{40}$/i.test(commit)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid repository details"
            });
        }

        // Fetch GitProHub File
        const content = await getGitProHubFile(
            owner,
            repository,
            commit
        );

        // Parse and Validate Metadata
        const metadata = parseFile(content);
        validateProject(metadata, owner, repository);

        // Read Database
        const projects = readDB();

        if (!Array.isArray(projects)) {
            throw new Error("Invalid database format");
        }

        // Find Existing Project
        const index = projects.findIndex(
            p =>
                p.owner?.toLowerCase() === owner.toLowerCase() &&
                p.repository?.toLowerCase() === repository.toLowerCase()
        );

        // Project Data
        const project = {
            ...metadata,
            owner,
            repository,
            commit,
            url: `https://github.com/${owner}/${repository}`,
            status: "verified",
            updatedAt: new Date().toISOString()
        };

        // Update or Add
        if (index >= 0) {
            projects[index] = project;
        } else {
            projects.push(project);
        }

        // Save
        saveDB(projects);

        // Response
        res.status(index >= 0 ? 200 : 201).json({
            success: true,
            message: index >= 0
                ? "GitProHub project updated"
                : "GitProHub project registered",
            project
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Registration failed"
        });
    }
});

module.exports = router;
