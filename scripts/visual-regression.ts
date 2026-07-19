import { chromium, type Page } from '@playwright/test';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

const BASE_URL = 'http://127.0.0.1:4321/my-note';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

interface ScreenshotSpec {
  name: string;
  path: string;
  viewport: { width: number; height: number };
  theme?: 'dark' | 'garden';
  click?: string;
  assertions?: Array<{ selector: string; description: string }>;
}

const specs: ScreenshotSpec[] = [
  {
    name: 'desktop-home',
    path: '/',
    viewport: { width: 1440, height: 900 },
    assertions: [{ selector: 'text=Redis', description: 'Redis topic card visible' }],
  },
  {
    name: 'desktop-topic',
    path: '/redis/',
    viewport: { width: 1440, height: 900 },
    assertions: [{ selector: 'text=Redis 数据结构', description: 'Chapter card visible' }],
  },
  {
    name: 'desktop-note',
    path: '/redis/data-structures/',
    viewport: { width: 1440, height: 900 },
    assertions: [{ selector: 'text=String', description: 'Note content visible' }],
  },
  {
    name: 'desktop-mindmap',
    path: '/redis/data-structures/?view=mindmap',
    viewport: { width: 1440, height: 900 },
    assertions: [{ selector: '#mindmap-canvas svg', description: 'Interactive mindmap rendered' }],
  },
  {
    name: 'desktop-mindmap-svg',
    path: '/redis/data-structures/?view=mindmap',
    viewport: { width: 1440, height: 900 },
    click: '#mm-toggle-mode',
    assertions: [{ selector: '#mindmap-svg-wrapper:not(.hidden) svg', description: 'SVG mindmap visible' }],
  },
  {
    name: 'desktop-overview',
    path: '/redis/redis-overview/',
    viewport: { width: 1440, height: 900 },
    assertions: [{ selector: '#mindmap-canvas svg', description: 'Overview mindmap rendered' }],
  },
  {
    name: 'mobile-home',
    path: '/',
    viewport: { width: 375, height: 812 },
    assertions: [{ selector: '#sidebar-toggle', description: 'Mobile menu button visible' }],
  },
  {
    name: 'mobile-mindmap',
    path: '/redis/data-structures/?view=mindmap',
    viewport: { width: 375, height: 812 },
    assertions: [{ selector: '#mindmap-canvas svg', description: 'Mobile mindmap rendered' }],
  },
  {
    name: 'garden-home',
    path: '/',
    viewport: { width: 1440, height: 900 },
    theme: 'garden',
    assertions: [{ selector: 'text=Redis', description: 'Garden theme home visible' }],
  },
  {
    name: 'garden-mindmap',
    path: '/redis/data-structures/?view=mindmap',
    viewport: { width: 1440, height: 900 },
    theme: 'garden',
    assertions: [{ selector: '#mindmap-canvas svg', description: 'Garden theme mindmap rendered' }],
  },
];

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function withBrowser<T>(fn: (page: Page) => Promise<T>, viewport: { width: number; height: number }): Promise<T> {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function capture(spec: ScreenshotSpec): Promise<{ name: string; passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  await withBrowser(
    async (page) => {
      await page.goto(`${BASE_URL}${spec.path}`);
      await page.waitForLoadState('networkidle');

      if (spec.theme === 'garden') {
        await page.click('#theme-toggle');
        await page.waitForTimeout(300);
      }

      if (spec.click) {
        await page.waitForSelector(spec.click);
        await page.click(spec.click);
        await page.waitForTimeout(500);
      }

      for (const assertion of spec.assertions || []) {
        try {
          await page.waitForSelector(assertion.selector, { timeout: 5000 });
        } catch (e) {
          errors.push(`Assertion failed: ${assertion.description} (${assertion.selector})`);
        }
      }

      if (errors.length === 0) {
        await page.screenshot({ path: `.screenshots/${spec.name}.png`, fullPage: true });
      }
    },
    spec.viewport,
  );

  return { name: spec.name, passed: errors.length === 0, errors };
}

async function main() {
  fs.mkdirSync('.screenshots', { recursive: true });

  const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    shell: true,
  });

  try {
    await waitForServer(`${BASE_URL}/`, 30000);
    console.log('Dev server ready.\n');

    const results: Array<{ name: string; passed: boolean; errors: string[] }> = [];
    for (const spec of specs) {
      const result = await capture(spec);
      results.push(result);
      const icon = result.passed ? '✓' : '✗';
      console.log(`${icon} ${spec.name}`);
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    console.log(`\n${passed}/${results.length} passed, ${failed} failed`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    devServer.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
