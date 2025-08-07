const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  /* 1. server statico */
  const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

  /* 2. Chromium */
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  console.log('⏳ Carico la mappa interattiva…');
  await page.goto('http://localhost:8080/src/mlgmap.html', {
    waitUntil: 'networkidle2',
    timeout: 180000
  });

  /* 3. aspetta che Leaflet abbia creato TUTTI i marker */
  await page.waitForFunction(
    'window.map && window.map._layers && Object.keys(window.map._layers).length > 50'
  );

  /* 4. estrai i dati in memoria */
  const preload = await page.evaluate(() => ({
    stazioni     : window.stazioni || [],
    clustersInfo : window.markerClusters ? window.markerClusters._zoom : null
  }));

  /* 5. genera il JS con i dati pre-caricati */
  const preloadJS = `window.__PRELOADED__ = ${JSON.stringify(preload)};`;
  const srcDir    = path.join(__dirname, '..', 'src');
  fs.writeFileSync(path.join(srcDir, 'preloaded-data.js'),
                   '/* auto-generated */\n' + preloadJS);

  /* 6. salva l’HTML (senza i dati – saranno in preload) */
  const html = await page.evaluate(() => {
    /* rimuovi eventuali marker sovrascritti in DOM */
    [...document.querySelectorAll('.leaflet-marker-icon')].forEach(n => n.remove());
    return document.documentElement.outerHTML;
  });

  const dist = path.join(__dirname, '..', 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  console.log('✅  index.html e preloaded-data.js aggiornati');

  await browser.close();
  server.kill();
})();
