const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const f of ['style-a', 'style-b', 'style-c']) {
    await p.goto('file://' + process.cwd() + '/' + f + '.html');
    await p.waitForTimeout(700);
    await p.screenshot({ path: f + '.png' });
  }
  await b.close();
  console.log('done');
})();
