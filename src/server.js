
require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITPROHUB_TOKEN;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// API Information
app.get("/", (req, res) => {
    res.json({
        name: "GitProHub API",
        status: "online",
        version: "1.3.0",

        endpoints: {
            status: "/",
            github: "/api/github",
            register: "/api/register",
            projects: "/api/projects",
            projectById: "/api/projects/:id",
            verify: "/api/verify/:owner/:repo"
        },

        links: {
            status: `${BASE_URL}/`,
            github: `${BASE_URL}/api/github`,
            register: `${BASE_URL}/api/register`,
            projects: `${BASE_URL}/api/projects`,
            projectById: `${BASE_URL}/api/projects/haproven`,
            verify: `${BASE_URL}/api/verify/haproven/haproven`
        },
        links: {
            status: `https://gitprohub-api.onrender.com/`,
            github: `https://gitprohub-api.onrender.com/api/github`,
            register: `https://gitprohub-api.onrender.com/api/register`,
            projects: `https://gitprohub-api.onrender.com/api/projects`,
            projectById: `https://gitprohub-api.onrender.com/api/projects/haproven`,
            verify: `https://gitprohub-api.onrender.com/api/verify/haproven/haproven`
        }
    });
});

// GitHub Authenticated API
app.get("/api/github", async (req, res) => {
    try {
        if (!GITHUB_TOKEN) {
            return res.status(500).json({
                success: false,
                error: "GitHub token is not configured"
            });
        }

        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: data.message || "GitHub API request failed"
            });
        }

        res.json({
            success: true,
            service: "GitHub API",
            status: "connected",
            user: {
                login: data.login,
                name: data.name,
                avatar_url: data.avatar_url,
                html_url: data.html_url
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: "GitHub API request failed"
        });
    }
});

// Routes
app.use("/api/register", require("./routes/register"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/verify", require("./routes/verify"));

// Start Server
app.listen(PORT, () => {
    console.log(`GitProHub API running at ${BASE_URL}`);
});
