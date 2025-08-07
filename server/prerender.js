const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  // 1. avvia il server statico
  const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

  // 2. lancia Chromium
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // 3. apre la mappa SORGENTE (interattiva)
  await page.goto('http://localhost:8080/src/mlgmap.html', {
    waitUntil: 'networkidle2',
    timeout: 180000            // 3 minuti
  });

  // 4. salva l'HTML (script inclusi) in dist/index.html
  const html = await page.content();
  const dist = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(dist)) fs.mkdirSync(dist);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  console.log('✔  index.html salvato in dist/');

  await browser.close();
  server.kill();
})();
