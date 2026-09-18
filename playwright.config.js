// Pruebas de punta a punta: `npm run test:e2e`.
//
// Levanta la API y la web en puertos propios (3100 y 5174) contra una base
// aparte (foodiebyte_e2e) que se vuelve a armar con la demo en cada corrida.
// Localmente usa el Google Chrome instalado; en el CI, el Chromium de
// Playwright (npx playwright install chromium).
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');
const { PUERTO_API, PUERTO_WEB, API, WEB, BASE_DE_DATOS } = require('./e2e/entorno');

const enCI = Boolean(process.env.CI);
const navegador = enCI || process.env.E2E_CHROMIUM ? {} : { channel: 'chrome' };

module.exports = defineConfig({
    testDir: './e2e',
    // Comparten la base de datos: corren de a una y en orden (01-, 02-…).
    workers: 1,
    fullyParallel: false,
    timeout: 45_000,
    expect: { timeout: 8_000 },
    retries: enCI ? 1 : 0,
    reporter: enCI ? [['list'], ['html', { open: 'never' }]] : [['list']],

    use: {
        baseURL: WEB,
        locale: 'es-AR',
        timezoneId: 'America/Argentina/Buenos_Aires',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },

    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 }, ...navegador }, testIgnore: /celular/ },
        { name: 'celular', use: { ...devices['Pixel 7'], ...navegador }, testMatch: /celular/ }
    ],

    webServer: [
        {
            // Antes de arrancar, vuelve a armar la base de las pruebas con la
            // demo. No borra las fotos subidas: esa carpeta es la misma que usa
            // la base de desarrollo.
            command: 'node scripts/preparar-base.js --reiniciar --conservar-fotos && node index.js',
            cwd: path.join(__dirname, 'server'),
            url: `${API}/api/health`,
            reuseExistingServer: false,
            timeout: 120_000,
            env: {
                PORT: String(PUERTO_API),
                DB_NAME: BASE_DE_DATOS,
                CORS_ORIGIN: WEB,
                ADMIN_PASSWORD: 'admin1234',
                DEMO_PASSWORD: 'demo1234'
            }
        },
        {
            command: `npx vite --port ${PUERTO_WEB} --strictPort`,
            cwd: path.join(__dirname, 'client'),
            url: WEB,
            reuseExistingServer: !enCI,
            timeout: 60_000,
            env: { VITE_API_URL: API }
        }
    ]
});
