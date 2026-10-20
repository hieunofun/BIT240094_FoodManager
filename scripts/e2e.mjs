import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startTestServers } from './test-servers.mjs';

const servers = await startTestServers();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
// Fixture tests must never write to a real project configured in .env.
const fixtureDatabase = {
  BIT240094_Version: 1,
  BIT240094_DishCategory: JSON.parse(
    await readFile('docs/mockapi/BIT240094_DishCategory.json', 'utf8'),
  ).map((row) => ({ ...row, BIT240094_Dirty: true })),
  BIT240094_Dish: JSON.parse(await readFile('docs/mockapi/BIT240094_Dish.json', 'utf8')).map(
    (row) => ({ ...row, BIT240094_Dirty: true }),
  ),
  BIT240094_Settings: {
    BIT240094_Language: 'en',
    BIT240094_ApiUrl: '',
    BIT240094_ApiConfigured: true,
    BIT240094_LastSyncedAt: null,
  },
};
await context.addInitScript((database) => {
  if (!localStorage.getItem('BIT240094_FoodManager'))
    localStorage.setItem('BIT240094_FoodManager', JSON.stringify(database));
}, fixtureDatabase);
await context.route(/https:\/\/[^/]+\.mockapi\.io\//, (route) => route.abort());
const page = await context.newPage();
const errors = [];
const networkErrors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => {
  if (request.url().startsWith('http://127.0.0.1:4174'))
    networkErrors.push({ url: request.url(), error: request.failure()?.errorText });
});
const screenshots = 'artifacts/e2e';
const visibleText = (text) => page.getByText(text, { exact: true }).filter({ visible: true });
await mkdir(screenshots, { recursive: true });
try {
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await visibleText('Dish library').waitFor();
  await page.getByRole('button', { name: 'Garden harvest salad', exact: true }).waitFor();
  await page
    .waitForFunction(
      () => [...document.images].some((image) => image.complete && image.naturalWidth > 0),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.screenshot({ path: `${screenshots}/desktop.png`, fullPage: true });
  console.log('PASS: English default and seeded menu');

  await page.getByRole('textbox', { name: 'Search by dish name' }).fill('pasta');
  assert.equal(
    await page.getByRole('button', { name: 'Basil pesto pasta', exact: true }).count(),
    1,
  );
  assert.equal(
    await page.getByRole('button', { name: 'House beef burger', exact: true }).count(),
    0,
  );
  await page.getByRole('button', { name: 'Basil pesto pasta', exact: true }).click();
  await visibleText('2 photos').waitFor();
  await page.getByRole('button', { name: 'Photos 2', exact: true }).click();
  await page.getByRole('button', { name: 'Set as cover', exact: true }).click();
  await page.getByRole('button', { name: 'Dishes', exact: true }).click();
  assert.equal(
    await page.getByRole('textbox', { name: 'Search by dish name' }).inputValue(),
    'pasta',
  );
  await page.getByRole('textbox', { name: 'Search by dish name' }).fill('');
  console.log('PASS: search, multiple images, cover and retained filters');

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Minimum price' }).fill('200000');
  await page.getByRole('textbox', { name: 'Maximum price' }).fill('100000');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await visibleText('Minimum price must not exceed maximum price.').waitFor();
  await page.getByRole('textbox', { name: 'Minimum price' }).fill('100000');
  await page.getByRole('textbox', { name: 'Maximum price' }).fill('150000');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await page.getByRole('button', { name: 'Basil pesto pasta', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Sunday pancakes', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  console.log('PASS: price range validation and filtering');

  await page.getByRole('button', { name: 'Add dish', exact: true }).click();
  await page.getByRole('button', { name: 'Create dish', exact: true }).click();
  await visibleText('Enter a name.').waitFor();
  await page.getByRole('textbox', { name: 'Dish name', exact: true }).fill('E2E online special');
  await page.getByRole('button', { name: 'Category: Choose a category', exact: true }).click();
  await page.getByRole('radio', { name: 'Starters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Price (VND)', exact: true }).fill('88000');
  await page.getByRole('textbox', { name: 'Preparation time (minutes)', exact: true }).fill('15');
  await page.getByRole('button', { name: 'Create dish', exact: true }).click();
  await page.getByRole('heading', { name: 'E2E online special', exact: true }).waitFor();
  await visibleText('Quick').waitFor();
  console.log('PASS: form validation, creation and Quick boundary');

  await page.getByRole('tab', { name: 'Categories', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
  await page.getByText(/This category is used by a dish/).waitFor();
  console.log('PASS: category-in-use deletion is blocked');

  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'MockAPI project URL' }).fill('http://127.0.0.1:4174');
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await visibleText('Connected').waitFor({ timeout: 30000 });
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('BIT240094_FoodManager')).BIT240094_Settings
        .BIT240094_LastSyncedAt !== null,
  );
  assert.equal(servers.resources.BIT240094_DishCategory.length, 3);
  assert.equal(servers.resources.BIT240094_Dish.length, 7);
  console.log('PASS: real HTTP synchronization to both fixture resources');

  await page.getByRole('tab', { name: 'Dishes', exact: true }).click();
  await context.setOffline(true);
  await visibleText('Offline').first().waitFor();
  await page.getByRole('button', { name: 'Add dish', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dish name', exact: true }).fill('E2E offline special');
  await page.getByRole('button', { name: 'Category: Choose a category', exact: true }).click();
  await page.getByRole('radio', { name: 'Starters', exact: true }).click();
  await page.getByRole('textbox', { name: 'Price (VND)', exact: true }).fill('77000');
  await page.getByRole('textbox', { name: 'Preparation time (minutes)', exact: true }).fill('16');
  await page.getByRole('button', { name: 'Create dish', exact: true }).click();
  await page.getByRole('heading', { name: 'E2E offline special', exact: true }).waitFor();
  await visibleText('Regular').waitFor();
  assert.equal(servers.resources.BIT240094_Dish.length, 7);
  await context.setOffline(false);
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('BIT240094_FoodManager')).BIT240094_Dish.some(
        (d) => d.BIT240094_Name === 'E2E offline special' && !d.BIT240094_Dirty,
      ),
    undefined,
    { timeout: 45000 },
  );
  assert.equal(
    servers.resources.BIT240094_Dish.filter((d) => d.BIT240094_Name === 'E2E offline special')
      .length,
    1,
  );
  console.log('PASS: offline create auto-syncs after reconnect without a sync button');

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Dish name', exact: true }).fill('E2E updated special');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('heading', { name: 'E2E updated special', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await visibleText('Delete this dish?').waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await visibleText('Delete this dish?').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Cancel', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: 'E2E updated special', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await visibleText('Dish library').waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'E2E updated special', exact: true }).count(),
    0,
  );
  console.log('PASS: edit and delete with confirmation');

  await page.getByRole('button', { name: 'Switch to Tiếng Việt', exact: true }).click();
  await visibleText('Danh sách món ăn').waitFor();
  await page.reload();
  await visibleText('Danh sách món ăn').waitFor();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForFunction(
    () => innerWidth === 375 && document.documentElement.scrollWidth <= 375,
  );
  await page.locator('body').evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${screenshots}/mobile-vi.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole('button', { name: 'Thêm món', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo món ăn', exact: true }).click();
  await visibleText('Vui lòng nhập tên.').waitFor();
  await page.getByRole('textbox', { name: 'Tên món', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const bounds = document.querySelector('input[aria-label="Tên món"]')?.getBoundingClientRect();
    return bounds && bounds.top >= 72 && bounds.bottom < innerHeight;
  });
  await page.screenshot({ path: `${screenshots}/mobile-validation.png`, fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  console.log('PASS: Vietnamese persistence, translated validation and 375px mobile layout');
  assert.deepEqual(errors, []);
  await writeFile(
    `${screenshots}/result.json`,
    JSON.stringify(
      {
        passed: true,
        pageErrors: errors,
        categories: servers.resources.BIT240094_DishCategory.length,
        dishes: servers.resources.BIT240094_Dish.length,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({ path: `${screenshots}/failure.png`, fullPage: true });
  console.error('Page errors:', errors);
  console.error('API network errors:', networkErrors);
  console.error('Visible text:', await page.locator('body').innerText());
  throw error;
} finally {
  await context.close();
  await browser.close();
  await servers.close();
}
