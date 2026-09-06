import assert from 'node:assert/strict';

import {
  After,
  Before,
  BeforeAll,
  Given,
  Then,
  When,
  setDefaultTimeout,
  setWorldConstructor,
  World,
} from '@cucumber/cucumber';
import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

const baseUrl = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';
const password = 'a-long-cucumber-test-password';

setDefaultTimeout(30_000);

BeforeAll(async function () {
  const deadline = Date.now() + 60_000;
  const discoveryUrl = `${baseUrl}/realms/local/.well-known/openid-configuration`;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(discoveryUrl)).ok) return;
    } catch {
      // The next bounded attempt handles local container startup.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Keycloak did not become ready at ${discoveryUrl}.`);
});

class FrontendWorld extends World {
  browser: Browser | undefined;
  context: BrowserContext | undefined;
  page: Page | undefined;
  email = `cucumber-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  invalidCase = '';
  responseStatus: number | undefined;
  responseBody: unknown;

  currentPage(): Page {
    assert.ok(this.page !== undefined);
    return this.page;
  }

  async resetContext(): Promise<void> {
    await this.context?.close();
    assert.ok(this.browser !== undefined);
    this.context = await this.browser.newContext({ baseURL: baseUrl });
    this.page = await this.context.newPage();
  }

  async register(email = this.email, suppliedPassword = password): Promise<void> {
    const page = this.currentPage();
    await page.goto('/');
    await page.getByRole('link', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/realms\/local\//);
    await page.getByRole('link', { name: 'Register' }).click();
    await page.getByLabel(/first name/i).fill('Cucumber');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(suppliedPassword);
    await page.getByLabel(/confirm password/i).fill(suppliedPassword);
    await page.getByRole('button', { name: 'Register' }).click();
  }

  async signOut(): Promise<void> {
    const page = this.currentPage();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  }

  async login(email: string, suppliedPassword: string): Promise<void> {
    const page = this.currentPage();
    await page.goto('/');
    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/realms\/local\//);
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[name="username"]');
    if ((await emailInput.count()) > 0) await emailInput.fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(suppliedPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
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

Given('I have no authenticated session', async function (this: FrontendWorld) {
  await this.context?.clearCookies();
});

Given('I am not signed in', async function (this: FrontendWorld) {
  await this.context?.clearCookies();
});

Given('a unique synthetic preview account', function () {});

Given('a synthetic preview account already exists', async function (this: FrontendWorld) {
  this.email = 'test-user@example.test';
});

Given('I am on the signup form', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await page.goto('/');
  await page.getByRole('link', { name: 'Create account' }).click();
  await page.getByRole('link', { name: 'Register' }).click();
});

Given('I am signed in with a synthetic preview account', async function (this: FrontendWorld) {
  await this.register();
  await expect(this.currentPage()).toHaveURL(/\/$/);
});

Given(
  'I retain a request that was authenticated by the current session',
  async function (this: FrontendWorld) {
    this.responseStatus = (await this.currentPage().request.get('/api/v1/auth/protected')).status();
    assert.equal(this.responseStatus, 200);
  },
);

When('I open the application', async function (this: FrontendWorld) {
  await this.currentPage().goto('/');
});

When('I complete signup with valid account details', async function (this: FrontendWorld) {
  await this.register();
});

When('I try to sign up with the same email address', async function (this: FrontendWorld) {
  await this.context?.clearCookies();
  await this.register(this.email);
});

When(
  'I submit signup with the following invalid value:',
  async function (this: FrontendWorld, table) {
    const row = table.hashes()[0];
    assert.ok(row !== undefined);
    const page = this.currentPage();
    this.invalidCase = row['field'] ?? '';
    await page.getByLabel(/first name/i).fill('Cucumber');
    await page.getByLabel(/last name/i).fill('User');
    await page.getByLabel(/email/i).fill(row['field'] === 'email' ? '' : this.email);
    const invalidPassword = row['field'] === 'password' ? row['value'] : password;
    assert.ok(invalidPassword !== undefined);
    await page
      .getByLabel(/password/i)
      .first()
      .fill(invalidPassword);
    await page.getByLabel(/confirm password/i).fill(invalidPassword);
    await page.getByRole('button', { name: 'Register' }).click();
  },
);

When("I log in with that account's valid credentials", async function (this: FrontendWorld) {
  await this.login(this.email, password);
});

When(
  'I try to log in using {string}',
  async function (this: FrontendWorld, credentialCase: string) {
    await this.context?.clearCookies();
    const email = credentialCase.includes('unknown')
      ? `unknown-${Date.now()}@example.test`
      : this.email;
    const suppliedPassword = credentialCase.includes('wrong') ? 'wrong-password' : password;
    await this.login(email, suppliedPassword);
  },
);

When('I log out', async function (this: FrontendWorld) {
  await this.signOut();
});

When('I request the public health endpoint', async function (this: FrontendWorld) {
  const response = await this.currentPage().request.get('/api/v1/health');
  this.responseStatus = response.status();
  this.responseBody = await response.json();
});

Then('I see {string}', async function (this: FrontendWorld, text: string) {
  await expect(this.currentPage().getByRole('heading', { name: text })).toBeVisible();
});

Then('I can choose to sign up or log in', async function (this: FrontendWorld) {
  const page = this.currentPage();
  await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
});

Then('I am signed in as that account', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByText(`Signed in as ${this.email}`)).toBeVisible();
});

Then(
  'the application reports an authenticated session for that account',
  async function (this: FrontendWorld) {
    const body: unknown = await (
      await this.currentPage().request.get('/api/v1/auth/session')
    ).json();
    assert.equal(
      typeof body === 'object' && body !== null && 'authenticated' in body && body.authenticated,
      true,
    );
  },
);

Then('signup is rejected as a conflict', async function (this: FrontendWorld) {
  await expect(this.currentPage().getByText(/already exists/i)).toBeVisible();
});

Then(
  'the existing account can still log in with its original credentials',
  async function (this: FrontendWorld) {
    await this.resetContext();
    await this.login(this.email, password);
    await expect(this.currentPage().getByText(`Signed in as ${this.email}`)).toBeVisible();
  },
);

Then(
  'signup is rejected with the validation problem {string}',
  async function (this: FrontendWorld, _problem: string) {
    const expected = this.invalidCase === 'email' ? /email/i : /password.*12|12.*character/i;
    await expect(this.currentPage().getByText(expected).first()).toBeVisible();
  },
);

Then(
  'login is rejected without revealing whether the account exists',
  async function (this: FrontendWorld) {
    await expect(this.currentPage().getByText('Invalid username or password.')).toBeVisible();
  },
);

Then('no authenticated session is created', async function (this: FrontendWorld) {
  await this.currentPage().goto('/');
  await expect(this.currentPage().getByRole('link', { name: 'Log in' })).toBeVisible();
});

Then('the application reports no authenticated session', async function (this: FrontendWorld) {
  const body: unknown = await (await this.currentPage().request.get('/api/v1/auth/session')).json();
  assert.deepEqual(body, { authenticated: false, principal: null });
});

Then(
  'replaying the retained authenticated request is rejected',
  async function (this: FrontendWorld) {
    this.responseStatus = (await this.currentPage().request.get('/api/v1/auth/protected')).status();
    assert.equal(this.responseStatus, 401);
  },
);

Then('protected access requires me to log in again', async function (this: FrontendWorld) {
  await this.currentPage().goto('/api/v1/auth/login');
  await expect(this.currentPage()).toHaveURL(/\/realms\/local\//);
  await expect(this.currentPage().getByRole('button', { name: 'Sign in' })).toBeVisible();
});

Then('the response status is {int}', function (this: FrontendWorld, status: number) {
  assert.equal(this.responseStatus, status);
});

Then('the response body is exactly:', function (this: FrontendWorld, expected: string) {
  assert.deepEqual(this.responseBody, JSON.parse(expected));
});
