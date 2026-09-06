import { expect, test, type Page } from '@playwright/test';

const password = 'a-long-local-test-password';

test('a visitor can sign up through Keycloak, establish a backend session, and log out', async ({
  page,
}) => {
  const email = `playwright-${Date.now()}@example.test`;
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  await completeSignup(page, email);

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  const authenticated = await page.request.get('/api/v1/auth/session');
  expect(await authenticated.json()).toEqual({
    authenticated: true,
    principal: expect.objectContaining({ email }),
  });

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
  const anonymous = await page.request.get('/api/v1/auth/session');
  expect(await anonymous.json()).toEqual({ authenticated: false, principal: null });
  const protectedRequest = await page.request.get('/api/v1/auth/protected');
  expect(protectedRequest.status()).toBe(401);
});

test('Keycloak rejects unknown login credentials without exposing account existence', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/realms\/local\//);
  await page.getByLabel(/email/i).fill(`unknown-${Date.now()}@example.test`);
  await page.getByRole('textbox', { name: 'Password' }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Invalid username or password.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
});

async function completeSignup(page: Page, email: string): Promise<void> {
  await page.getByRole('link', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/realms\/local\//);
  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByLabel(/first name/i).fill('Playwright');
  await page.getByLabel(/last name/i).fill('User');
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(password);
  await page.getByLabel(/confirm password/i).fill(password);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL(/\/$/);
}
