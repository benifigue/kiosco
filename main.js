const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let nextServerProcess;

// Configuración de la Base de Datos para el cliente
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'database');
const dbPath = path.join(dbDir, 'database.db');

function prepareDatabase() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Si la base de datos no existe en AppData, la copiamos de la carpeta del proyecto
  if (!fs.existsSync(dbPath)) {
    const templateDbPath = isDev 
      ? path.join(__dirname, 'prisma', 'dev.db')
      : path.join(process.resourcesPath, 'prisma', 'dev.db');
    
    if (fs.existsSync(templateDbPath)) {
      fs.copyFileSync(templateDbPath, dbPath);
      console.log('Nueva base de datos creada para el cliente.');
    }
  }
}

function createWindow() {
  prepareDatabase();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Kiosco Manager",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  const url = 'http://localhost:3000';

  // Si estamos en producción, esperamos un momento a que el servidor inicie
  if (!isDev) {
    const startServer = () => {
      // Intentamos cargar la URL cada 500ms hasta que el servidor responda
      mainWindow.loadURL(url).catch(() => {
        setTimeout(startServer, 500);
      });
    };
    startServer();
  } else {
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Iniciar servidor de Next.js en producción
if (!isDev) {
  const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next');
  nextServerProcess = spawn(nextPath, ['start'], {
    cwd: __dirname,
    shell: true,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  nextServerProcess.stdout.on('data', (data) => console.log(`Next Server: ${data}`));
  nextServerProcess.stderr.on('data', (data) => console.error(`Next Server Error: ${data}`));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (nextServerProcess) nextServerProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
