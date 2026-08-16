const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (let i = 2; i < process.argv.length; i += 2) {
    const src = process.argv[i], out = process.argv[i + 1];
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    await p.goto('file://' + src);
    await p.waitForTimeout(2500);
    // в печати все слайды видимы одновременно; анимации доводим до конечного состояния
    await p.evaluate(() => document.querySelectorAll('.slide').forEach(s => s.classList.add('visible')));
    await p.waitForTimeout(2500);
    await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, pageRanges: '1-6' });
    console.log(out);
    await p.close();
  }
  await b.close();
})();
