import assert from 'node:assert/strict';

import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const baseUrl = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';

class FrontendWorld extends World {
  browser: Browser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;
  responseStatus: number | undefined;
  responseBody: unknown;

  currentPage(): Page {
    assert.ok(this.page !== undefined);
    return this.page;
  }
}

setWorldConstructor(FrontendWorld);

Before(async function (this: FrontendWorld) {
  this.browser = await chromium.launch();
  this.context = await this.browser.newContext({ baseURL: baseUrl });
  this.page = await this.context.newPage();
});

After(async function (this: FrontendWorld) {
  await this.context?.close();
  await this.browser?.close();
});

Given('the public starter is running', async function (this: FrontendWorld) {
  assert.equal((await this.currentPage().request.get('/api/v1/health')).status(), 200);
});

Given('I am not signed in', function () {});

When('I open the application', async function (this: FrontendWorld) {
  await this.currentPage().goto('/');
});

When('I open the component catalog', async function (this: FrontendWorld) {
  await this.currentPage().goto('/components');
});

When('I open the example dialog', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Open example dialog' }).click();
});

Then('the example dialog is visible and receives focus', async function (this: FrontendWorld) {
  const dialog = this.currentPage().getByRole('dialog', { name: 'Example dialog' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
});

Then('the disabled example action cannot be activated', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('button', { name: 'Unavailable action' }),
  ).toBeDisabled();
});

When('I open the data workspace example', async function (this: FrontendWorld) {
  await this.currentPage().goto('/components/data');
});

Then('I can filter rows by a search term', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('searchbox', { name: 'Search records' }).fill('gamma');
  await expect(this.currentPage().getByRole('row', { name: /Gamma/ })).toBeVisible();
  await expect(this.currentPage().getByRole('row', { name: /Alpha/ })).toHaveCount(0);
});

Then('I can sort the visible rows', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('searchbox', { name: 'Search records' }).clear();
  await this.currentPage().getByRole('button', { name: 'Sort by name' }).click();
  await expect(this.currentPage().locator('tbody tr').first()).toContainText('Alpha');
});

Then('I can select a visible row', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('checkbox', { name: 'Select Alpha' }).check();
  await expect(this.currentPage().getByText('1 selected')).toBeVisible();
});

When('I open the organization examples', async function (this: FrontendWorld) {
  await this.currentPage().goto('/components/organization');
});

Then('I can expand and choose a tree item with the keyboard', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('treeitem', { name: 'Projects' }).focus();
  await this.currentPage().keyboard.press('ArrowRight');
  await expect(this.currentPage().getByRole('treeitem', { name: 'Design files' })).toBeVisible();
  await this.currentPage().keyboard.press('ArrowDown');
  await this.currentPage().keyboard.press('Enter');
  await expect(this.currentPage().getByText('Selected: Design files')).toBeVisible();
});

Then('I can move an available item into the selected list', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('checkbox', { name: 'Select Available A' }).check();
  await this.currentPage().getByRole('button', { name: 'Move selected right' }).click();
  await expect(this.currentPage().getByRole('list', { name: 'Selected items' })).toContainText(
    'Available A',
  );
});

When('I open the input examples', async function (this: FrontendWorld) {
  await this.currentPage().goto('/components/inputs');
});

Then('an out-of-range date cannot be selected', async function (this: FrontendWorld) {
  await this.currentPage().getByLabel('Appointment date').fill('2020-01-01');
  await expect(this.currentPage().getByText('Date is outside the allowed range')).toBeVisible();
});

When('I open the layout examples on a narrow viewport', async function (this: FrontendWorld) {
  await this.currentPage().setViewportSize({ width: 320, height: 700 });
  await this.currentPage().goto('/components/layouts');
});

Then('the workspace has no horizontal page overflow', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('heading', { name: 'Workspace layouts' }),
  ).toBeVisible();
  const overflow = await this.currentPage().evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  assert.equal(overflow, false);
});

When('I open the page layout gallery', async function (this: FrontendWorld) {
  await this.currentPage().goto('/components/layout-gallery');
});

Then(
  'I can inspect marketing documentation dashboard detail editor inbox gallery form and status layouts',
  async function (this: FrontendWorld) {
    for (const name of [
      'Marketing',
      'Documentation',
      'Dashboard',
      'Detail',
      'Editor',
      'Inbox',
      'Gallery',
      'Form',
      'Status',
    ]) {
      await expect(
        this.currentPage().getByRole('heading', { name: `${name} layout` }),
      ).toBeVisible();
    }
  },
);

When(
  'I request reduced motion and open the component catalog',
  async function (this: FrontendWorld) {
    await this.currentPage().emulateMedia({ reducedMotion: 'reduce' });
    await this.currentPage().goto('/components');
  },
);

Then(
  'the example action has an effectively instant transition',
  async function (this: FrontendWorld) {
    const duration = await this.currentPage()
      .getByRole('button', { name: 'Open example dialog' })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    assert.match(duration, /0\.00001s|1e-05s|0s/);
  },
);

When('I request the public health endpoint', async function (this: FrontendWorld) {
  const response = await this.currentPage().request.get('/api/v1/health');
  this.responseStatus = response.status();
  this.responseBody = await response.json();
});

Then('I see {string}', async function (this: FrontendWorld, text: string) {
  await expect(this.currentPage().getByRole('heading', { name: text })).toBeVisible();
});

Then('there are no sign-up or login controls', async function (this: FrontendWorld) {
  await expect(
    this.currentPage().getByRole('link', { name: /sign up|log in|create account/i }),
  ).toHaveCount(0);
});

Then('the response status is {int}', function (this: FrontendWorld, status: number) {
  assert.equal(this.responseStatus, status);
});

Then('the response body is exactly:', function (this: FrontendWorld, expected: string) {
  assert.deepEqual(this.responseBody, JSON.parse(expected));
});
