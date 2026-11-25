
require("dotenv").config();

const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITPROHUB_TOKEN;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const { scanRepositories } = require("./services/scanner");

let isScanning = false;

// Scan Function
async function runScan() {
    if (isScanning) {
        console.log("Scan already running, skipping...");
        return;
    }

    isScanning = true;

    try {
        const result = await scanRepositories("haproven");
        console.log("GitProHub Scan:", result);
    } catch (error) {
        console.error("Scan failed:", error.message);
    } finally {
        isScanning = false;
    }
}

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
            verify: "/api/verify/:owner/:repo",
            scan: "/api/scan"
        },
        links: {
            status: `${BASE_URL}/`,
            github: `${BASE_URL}/api/github`,
            register: `${BASE_URL}/api/register`,
            projects: `${BASE_URL}/api/projects`,
            projectById: `${BASE_URL}/api/projects/haproven`,
            verify: `${BASE_URL}/api/verify/haproven/haproven`,
            scan: `${BASE_URL}/api/scan`
        }
    });
});

// GitHub Connection
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

// Manual Scan (Protected)
app.post("/api/scan", async (req, res) => {
    if (!GITHUB_TOKEN) {
        return res.status(500).json({
            success: false,
            error: "GitHub token is not configured"
        });
    }

    if (req.headers.authorization !== `Bearer ${GITHUB_TOKEN}`) {
        return res.status(401).json({
            success: false,
            error: "Unauthorized"
        });
    }

    if (isScanning) {
        return res.status(409).json({
            success: false,
            message: "Scan already running"
        });
    }

    isScanning = true;

    try {
        const result = await scanRepositories("haproven");
        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        isScanning = false;
    }
});

// Routes
app.use("/api/register", require("./routes/register"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/verify", require("./routes/verify"));

// Start Server
app.listen(PORT, () => {
    console.log(`GitProHub API running at ${BASE_URL}`);

    // Initial Scan
    runScan();

    // Automatic Scan Every 5 Minutes
    setInterval(runScan, 5 * 60 * 1000);
});























// require("dotenv").config();

// const express = require("express");
// const app = express();

// app.use(express.json());

// const PORT = process.env.PORT || 3000;
// const GITHUB_TOKEN = process.env.GITPROHUB_TOKEN;
// const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// // API Information
// app.get("/", (req, res) => {
//     res.json({
//         name: "GitProHub API",
//         status: "online",
//         version: "1.3.0",

//         endpoints: {
//             status: "/",
//             github: "/api/github",
//             register: "/api/register",
//             projects: "/api/projects",
//             projectById: "/api/projects/:id",
//             verify: "/api/verify/:owner/:repo",
//             scan: "/api/scan"
//         },

//         links: {
//             status: `${BASE_URL}/`,
//             github: `${BASE_URL}/api/github`,
//             register: `${BASE_URL}/api/register`,
//             projects: `${BASE_URL}/api/projects`,
//             projectById: `${BASE_URL}/api/projects/haproven`,
//             verify: `${BASE_URL}/api/verify/haproven/haproven`,
//             scan: `${BASE_URL}/api/scan`
//         }
//     });
// });

// // GitHub Authenticated API
// app.get("/api/github", async (req, res) => {
//     try {
//         if (!GITHUB_TOKEN) {
//             return res.status(500).json({
//                 success: false,
//                 error: "GitHub token is not configured"
//             });
//         }

//         const response = await fetch("https://api.github.com/user", {
//             headers: {
//                 Authorization: `Bearer ${GITHUB_TOKEN}`,
//                 Accept: "application/vnd.github+json",
//                 "X-GitHub-Api-Version": "2022-11-28"
//             }
//         });

//         const data = await response.json();

//         if (!response.ok) {
//             return res.status(response.status).json({
//                 success: false,
//                 error: data.message || "GitHub API request failed"
//             });
//         }

//         res.json({
//             success: true,
//             service: "GitHub API",
//             status: "connected",
//             user: {
//                 login: data.login,
//                 name: data.name,
//                 avatar_url: data.avatar_url,
//                 html_url: data.html_url
//             }
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             error: "GitHub API request failed"
//         });
//     }
// });

// // GitProHub Auto Scanner
// app.post("/api/scan", async (req, res) => {
//     try {
//         const { scanRepositories } = require("./services/scanner");

//         const result = await scanRepositories("haproven");

//         res.json(result);

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// });

// // Routes
// app.use("/api/register", require("./routes/register"));
// app.use("/api/projects", require("./routes/projects"));
// app.use("/api/verify", require("./routes/verify"));

// // Start Server
// app.listen(PORT, () => {
//     console.log(`GitProHub API running at ${BASE_URL}`);
// });