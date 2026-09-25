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
