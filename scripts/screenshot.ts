import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE_URL = 'http://127.0.0.1:4321/my-note';

async function withBrowser<T>(fn: (page: any) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const result = await fn(page);
  await browser.close();
  return result;
}

async function screenshot(path: string, filename: string, options: { waitFor?: string; click?: string; theme?: 'dark' | 'garden' } = {}) {
  await withBrowser(async (page) => {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState('networkidle');
    if (options.waitFor) {
      await page.waitForSelector(options.waitFor);
    }
    if (options.theme === 'garden') {
      await page.click('#theme-toggle');
      await page.waitForTimeout(300);
    }
    if (options.click) {
      await page.click(options.click);
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: `.screenshots/${filename}`, fullPage: true });
    console.log(`✓ ${filename}`);
  });
}

(async () => {
  fs.mkdirSync('.screenshots', { recursive: true });

  await screenshot('/', '01-home.png');
  await screenshot('/redis/', '02-topic.png');
  await screenshot('/redis/data-structures/', '03-note.png');
  await screenshot('/redis/data-structures/?view=mindmap', '04-mindmap.png');
  await screenshot('/redis/redis-overview/', '05-overview.png');
  await screenshot('/redis/data-structures/?view=mindmap', '06-mindmap-svg.png', {
    waitFor: '#mm-toggle-mode',
    click: '#mm-toggle-mode',
  });

  // Garden theme screenshots
  await screenshot('/', '07-home-garden.png', { theme: 'garden' });
  await screenshot('/redis/data-structures/?view=mindmap', '08-mindmap-garden.png', { theme: 'garden' });

  console.log('All screenshots done.');
})();
