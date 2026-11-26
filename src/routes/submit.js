const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");

const {
    getRepositoryInfo,
    getLatestCommit,
    getGitProHubFile
} = require("../services/github");

const { parseFile, validateProject } = require("../services/validator");

const DB_PATH = path.join(__dirname, "../../database/projects.json");

// Submit and register repository
router.post("/", async (req, res) => {
    try {
        const { owner, repository } = req.body;

        // Input validation
        if (
            typeof owner !== "string" ||
            typeof repository !== "string" ||
            !owner.trim() ||
            !repository.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: "Owner and repository are required"
            });
        }

        const cleanOwner = owner.trim();
        const cleanRepository = repository.trim();

        if (!/^[A-Za-z0-9-]+$/.test(cleanOwner)) {
            return res.status(400).json({
                success: false,
                error: "Invalid GitHub owner"
            });
        }

        if (!/^[A-Za-z0-9._-]+$/.test(cleanRepository)) {
            return res.status(400).json({
                success: false,
                error: "Invalid repository name"
            });
        }

        // Get repository details
        const repoInfo = await getRepositoryInfo(
            cleanOwner,
            cleanRepository
        );

        if (repoInfo.private) {
            return res.status(400).json({
                success: false,
                error: "Private repositories are not supported"
            });
        }

        if (repoInfo.archived) {
            return res.status(400).json({
                success: false,
                error: "Archived repositories are not supported"
            });
        }

        // Get default branch latest commit
        const commit = await getLatestCommit(
            cleanOwner,
            cleanRepository,
            repoInfo.default_branch
        );

        // Fetch gitprohub.md
        const content = await getGitProHubFile(
            cleanOwner,
            cleanRepository,
            commit
        );

        // Parse and validate metadata
        const metadata = parseFile(content);

        validateProject(
            metadata,
            cleanOwner,
            cleanRepository
        );

        // Read database
        let projects = [];

        if (fs.existsSync(DB_PATH)) {
            projects = JSON.parse(
                fs.readFileSync(DB_PATH, "utf8")
            );
        }

        if (!Array.isArray(projects)) {
            throw new Error("Invalid database format");
        }

        // Find existing project
        const existingIndex = projects.findIndex(project =>
            project.owner?.toLowerCase() === cleanOwner.toLowerCase() &&
            project.repository?.toLowerCase() === cleanRepository.toLowerCase()
        );

        // Create project record
        const project = {
            ...metadata,
            owner: cleanOwner,
            repository: cleanRepository,
            commit,
            url: `https://github.com/${cleanOwner}/${cleanRepository}`,
            status: "verified",
            updatedAt: new Date().toISOString()
        };

        let statusCode;
        let message;

        // Update or register
        if (existingIndex !== -1) {
            projects[existingIndex] = {
                ...projects[existingIndex],
                ...project
            };

            statusCode = 200;
            message = "Repository updated successfully";
        } else {
            projects.push(project);

            statusCode = 201;
            message = "Repository registered successfully";
        }

        // Save database
        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(projects, null, 2)
        );

        return res.status(statusCode).json({
            success: true,
            message,
            project
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;