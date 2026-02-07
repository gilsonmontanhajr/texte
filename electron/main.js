const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let mainWindow;
let nextServer;
const PORT = 3000; // Could be dynamic

const isDev = process.env.NODE_ENV === "development";

function createServer() {
    return new Promise((resolve, reject) => {
        if (isDev) {
            resolve(`http://localhost:${PORT}`);
            return;
        }

        // Path to the Next.js standalone server
        // When packed by electron-builder, resources are in resources/app
        const serverPath = path.join(
            process.resourcesPath,
            "app",
            ".next",
            "standalone",
            "server.js"
        );

        // Check if we are running from source (during dev/testing of prod build)
        const localServerPath = path.join(__dirname, "..", ".next", "standalone", "server.js");

        const finalPath = require("fs").existsSync(serverPath) ? serverPath : localServerPath;

        console.log("Starting Next.js server from:", finalPath);

        nextServer = spawn("node", [finalPath], {
            env: { ...process.env, PORT: PORT.toString(), HOSTNAME: "127.0.0.1" },
            cwd: path.dirname(finalPath), // Run from inside standalone
        });

        nextServer.stdout.on("data", (data) => {
            console.log(`Next.js: ${data}`);
        });

        nextServer.stderr.on("data", (data) => {
            console.error(`Next.js Error: ${data}`);
        });

        // Validating server is ready
        const checkServer = setInterval(() => {
            http.get(`http://127.0.0.1:${PORT}`, (res) => {
                clearInterval(checkServer);
                resolve(`http://127.0.0.1:${PORT}`);
            }).on('error', () => {
                // keep waiting
            });
        }, 100);
    });
}

async function createWindow() {
    const url = await createServer();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "Texte",
        icon: path.join(__dirname, "../public/icon.png"), // Development path
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadURL(url);

    mainWindow.on("closed", function () {
        mainWindow = null;
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
    if (mainWindow === null) createWindow();
});

app.on("will-quit", () => {
    if (nextServer) nextServer.kill();
});
