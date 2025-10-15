// electron/main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
    });

    if (isDev) {
        win.loadURL("http://localhost:3000"); // Vite면 5173
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, "../build/index.html")); // CRA build 결과
    }
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
