import { chromium } from 'playwright-core';
const exe = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true });
async function probe(url) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  const client = await page.context().newCDPSession(page);
  await client.send('DOM.enable');
  await client.send('CSS.enable');
  await client.send('Page.enable');
  await client.send('DOM.getDocument', { depth: 1 });
  const { result } = await client.send('Runtime.evaluate', {
    expression: `document.querySelector('#smart-head .menu > li:nth-child(5) > a, #smart-head .pt-navigation > li:nth-child(5) > a')`,
  });
  const { nodeId } = await client.send('DOM.requestNode', { objectId: result.objectId });
  await client.send('DOM.describeNode', { nodeId });
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId });
  const meta = await page.evaluate(() => {
    const a = document.querySelector('#smart-head .menu > li:nth-child(5) > a, #smart-head .pt-navigation > li:nth-child(5) > a');
    return { w: Math.round(a.getBoundingClientRect().width*100)/100, fw: getComputedStyle(a).fontWeight };
  });
  await ctx.close();
  return { url, fonts, meta };
}
console.log('LIVE:', JSON.stringify(await probe('https://petrotimes.ir/')));
console.log('MINE:', JSON.stringify(await probe('http://localhost:3000')));
await browser.close();
