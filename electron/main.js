const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const waitOn = require("wait-on");

let pyProc = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
	autoHideMenuBar: true, 
	//icon: path.join(__dirname, "icon.ico"),
  });
  
   win.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
  } else {
    win.loadFile(path.join(process.resourcesPath, "frontend/dist/index.html"));
  }

  //win.webContents.openDevTools();
}

console.log("Electron started");

function startPython() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    console.log("Running in DEV mode");

    const pythonPath = path.join(__dirname, "../backend/venv/Scripts/python.exe");

    pyProc = spawn(pythonPath, ["-m", "app.main"], {
      cwd: path.join(__dirname, "../backend"),
    });

  } else {
    console.log("Running in PROD mode");

    const isWin = process.platform === "win32";
	const binaryName = isWin ? "main.exe" : "main";
	const exePath = path.join(process.resourcesPath, `backend/${binaryName}`);

    console.log("EXE PATH:", exePath);

    pyProc = spawn(exePath);
  }

  pyProc.stdout.on("data", (data) => {
    console.log(`PYTHON: ${data}`);
  });

  pyProc.stderr.on("data", (data) => {
    console.error(`PYTHON ERROR: ${data}`);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // keep this

  startPython();

  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on("will-quit", () => {
  if (pyProc) pyProc.kill();
});