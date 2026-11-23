
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const DB = path.join(__dirname, "../../database/projects.json");

// Read Database
function readDB() {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
}

// All Projects
router.get("/", (req, res) => {
    try {
        const projects = readDB();

        res.json({
            success: true,
            count: projects.length,
            projects
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
});

// Project by ID
router.get("/:id", (req, res) => {
    try {
        const projects = readDB();

        const project = projects.find(
            p => p.id?.toLowerCase() === req.params.id.toLowerCase()
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.json({
            success: true,
            project
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Database error"
        });
    }
});

module.exports = router;
