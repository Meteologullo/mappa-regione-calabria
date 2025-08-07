const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

(async () => {
  /* 1. avvia server statico */
  const server = spawn('node', ['server/index.js'], { stdio: 'inherit' });

  /* 2. lancia Chromium */
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  console.log('🗺️  Carico la mappa sorgente…');
  await page.goto('http://localhost:8080/src/mlgmap.html', {
    waitUntil: 'networkidle2',
    timeout: 180000
  });

  /* 3. duplica tutti gli <script> (così si rieseguono) */
  const html = await page.evaluate(() => {
    const clones = [...document.querySelectorAll('script')].map(s => {
      const c = document.createElement('script');
      [...s.attributes].forEach(a => c.setAttribute(a.name, a.value));
      c.textContent = s.textContent;
      return c.outerHTML;
    }).join('');
    return document.documentElement.outerHTML.replace('</body>', clones + '</body>');
  });

  /* 4. salva in dist/index.html */
  const dist = path.join(__dirname, '..', 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  console.log('✅  index.html salvato in dist/');

  await browser.close();
  server.kill();
})();
