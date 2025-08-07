// prerender.js
const http = require('http');
const path = require('path');
const fs = require('fs');
const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');
const puppeteer = require('puppeteer');

const PORT = 8080;
const serve = serveStatic('.', { index: ['index.html'] });

async function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => serve(req, res, finalhandler(req, res)));
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  const server = await startServer();
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const page = await browser.newPage();

  // Apri il sorgente (non la pages) così usi i file locali
  const url = `http://localhost:${PORT}/src/mlgmap.html`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

  // aspetta che i marker siano montati (senza toccare il tuo codice)
  await page.waitForFunction(
    'document.querySelectorAll(".leaflet-marker-icon").length > 30',
    { timeout: 120000 }
  );

  // inietta redirezione all’avvio verso / (così l’utente entra sempre da index)
  await page.addScriptTag({content: `
    if (location.pathname.endsWith('/src/mlgmap.html')) {
      window.addEventListener('load', () => {
        // la pagina è già pronta, ma ricaricherà su / per far valere l'SW
        if (!sessionStorage.__fromPrerender) {
          sessionStorage.__fromPrerender = '1';
          location.replace('../');
        }
      });
    }
  `});

  const html = await page.content();
  const outDir = path.join('dist');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');

  await browser.close();
  server.close();

  console.log('✅ Prerender ok → dist/index.html');
})();
