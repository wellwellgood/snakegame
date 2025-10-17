// electron/main.js
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
    const win = new BrowserWindow({
        width: 806,
        height: 836,
        backgroundColor: "#111",
        webPreferences: { contextIsolation: true },
    });

    // 에러/상태 로그
    win.webContents.on("did-fail-load", (e, code, desc, url) => {
        console.error("did-fail-load:", code, desc, url);
        win.loadURL("data:text/plain;charset=utf-8," + encodeURIComponent(`Load fail:\n${code} ${desc}\n${url}`));
    });
    win.webContents.on("render-process-gone", (_, details) => {
        console.error("render gone:", details);
    });

    const DEV_URL = "http://127.0.0.1:8082";
    if (!app.isPackaged) {
        win.loadURL(DEV_URL);
        win.webContents.openDevTools({ mode: "detach" });
    } else {
        const indexPath = path.resolve(__dirname, "../build/index.html");
        win.loadFile(indexPath);
    }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
