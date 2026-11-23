
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const DB = path.join(__dirname, "../../database/projects.json");

// Verify Project
router.get("/:owner/:repo", (req, res) => {
    try {
        const projects = JSON.parse(fs.readFileSync(DB, "utf8"));

        const project = projects.find(
            p =>
                p.owner?.toLowerCase() === req.params.owner.toLowerCase() &&
                p.repository?.toLowerCase() === req.params.repo.toLowerCase()
        );

        res.json({
            success: true,
            verified: !!project,
            project: project || null
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
});

module.exports = router;
