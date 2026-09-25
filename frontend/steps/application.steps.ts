import assert from 'node:assert/strict';

import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { designSystems, requiredTokens, selectableIds } from '../design-system/themes/registry.js';

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

const preferenceKey = 'design-system-preference';

function presetId(name: string): string {
  const brief = designSystems.find((candidate) => candidate.name === name);
  assert.ok(brief !== undefined, `Unknown design system ${name}`);
  return brief.id;
}

async function tokenUnderPreset(page: Page, token: string, preset: string): Promise<string[]> {
  return page.evaluate(
    ({ token, preset }) => {
      const root = document.documentElement;
      const current = root.dataset.theme ?? '';
      const selected = getComputedStyle(root).getPropertyValue(`--${token}`).trim();
      root.dataset.theme = preset;
      const other = getComputedStyle(root).getPropertyValue(`--${token}`).trim();
      root.dataset.theme = current;
      return [selected, other];
    },
    { token, preset },
  );
}

When('I open the design system gallery', async function (this: FrontendWorld) {
  await this.currentPage().goto('/design-systems');
});

Given('the saved design system preference is corrupt', async function (this: FrontendWorld) {
  await this.currentPage().addInitScript((key) => {
    window.localStorage.setItem(key, '{"preset":');
  }, preferenceKey);
});

Given(
  'the saved design system preference names an unknown preset',
  async function (this: FrontendWorld) {
    await this.currentPage().addInitScript((key) => {
      window.localStorage.setItem(key, JSON.stringify({ preset: 'ds-99', mode: 'dark' }));
    }, preferenceKey);
  },
);

Then('the design system picker lists every preset slot', async function (this: FrontendWorld) {
  const picker = this.currentPage().getByRole('radiogroup', { name: 'Design system' });
  await expect(picker.getByRole('radio')).toHaveCount(designSystems.length);
});

Then(
  'the gallery shows foundations actions inputs navigation overlays data and motion',
  async function (this: FrontendWorld) {
    for (const name of [
      'Foundations',
      'Actions',
      'Inputs',
      'Navigation',
      'Overlays',
      'Data display',
      'Motion',
    ]) {
      await expect(
        this.currentPage().getByRole('heading', { name, exact: true, level: 2 }),
      ).toBeVisible();
    }
  },
);

When('I choose the {string} design system', async function (this: FrontendWorld, name: string) {
  await this.currentPage()
    .getByRole('radiogroup', { name: 'Design system' })
    .getByRole('radio', { name, exact: true })
    .check();
});

When('I choose the {word} color mode', async function (this: FrontendWorld, mode: string) {
  const name = `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
  await this.currentPage()
    .getByRole('radiogroup', { name: 'Color mode' })
    .getByRole('radio', { name, exact: true })
    .check();
});

When('I reload the page', async function (this: FrontendWorld) {
  await this.currentPage().reload();
});

Then('the document uses the {string} preset', async function (this: FrontendWorld, id: string) {
  await expect(this.currentPage().locator('html')).toHaveAttribute('data-theme', id);
});

Then('the document is in dark mode', async function (this: FrontendWorld) {
  await expect(this.currentPage().locator('html')).toHaveClass(/(^|\s)dark(\s|$)/);
});

Then('the document is in light mode', async function (this: FrontendWorld) {
  await expect(this.currentPage().locator('html')).not.toHaveClass(/(^|\s)dark(\s|$)/);
});

Then(
  'the primary action color differs from the {string} preset',
  async function (this: FrontendWorld, name: string) {
    const [selected, other] = await tokenUnderPreset(this.currentPage(), 'primary', presetId(name));
    assert.ok(selected !== undefined && selected !== '');
    assert.notEqual(selected, other);
  },
);

Then(
  'the heading font differs from the {string} preset',
  async function (this: FrontendWorld, name: string) {
    const heading = this.currentPage().getByRole('heading', { name: 'Design systems', level: 1 });
    const [selected, other] = await heading.evaluate((element, preset) => {
      const root = document.documentElement;
      const current = root.dataset.theme ?? '';
      const selectedFont = getComputedStyle(element).fontFamily;
      root.dataset.theme = preset;
      const otherFont = getComputedStyle(element).fontFamily;
      root.dataset.theme = current;
      return [selectedFont, otherFont];
    }, presetId(name));
    assert.notEqual(selected, other);
  },
);

When('I open the preset example dialog', async function (this: FrontendWorld) {
  await this.currentPage().getByRole('button', { name: 'Open preset dialog' }).click();
});

Then(
  'the example dialog surface uses the preset popover color',
  async function (this: FrontendWorld) {
    const dialog = this.currentPage().getByRole('dialog', { name: 'Preset dialog' });
    await expect(dialog).toBeVisible();
    const [surface, expected, foundation] = await dialog.evaluate((element) => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = 'var(--popover)';
      document.body.append(probe);
      const selected = getComputedStyle(probe).backgroundColor;
      const root = document.documentElement;
      const current = root.dataset.theme ?? '';
      root.dataset.theme = 'ds-01';
      const baseline = getComputedStyle(probe).backgroundColor;
      root.dataset.theme = current;
      probe.remove();
      return [getComputedStyle(element).backgroundColor, selected, baseline];
    });
    assert.equal(surface, expected);
    assert.notEqual(surface, foundation);
  },
);

Then('the page background differs from light mode', async function (this: FrontendWorld) {
  const [dark, light] = await this.currentPage().evaluate(() => {
    const root = document.documentElement;
    const darkValue = getComputedStyle(document.body).backgroundColor;
    root.classList.remove('dark');
    const lightValue = getComputedStyle(document.body).backgroundColor;
    root.classList.add('dark');
    return [darkValue, lightValue];
  });
  assert.notEqual(dark, light);
});

Then('every preset slot can be chosen', async function (this: FrontendWorld) {
  const picker = this.currentPage().getByRole('radiogroup', { name: 'Design system' });
  for (const brief of designSystems) {
    await expect(picker.getByRole('radio', { name: brief.name, exact: true })).toBeEnabled();
  }
});

Then(
  'every ready preset resolves every required token in light and dark mode',
  async function (this: FrontendWorld) {
    const missing = await this.currentPage().evaluate(
      ({ ids, tokens }) => {
        const root = document.documentElement;
        const initialTheme = root.dataset.theme ?? '';
        const initialDark = root.classList.contains('dark');
        const gaps: string[] = [];
        for (const id of ids) {
          for (const dark of [false, true]) {
            root.dataset.theme = id;
            root.classList.toggle('dark', dark);
            const style = getComputedStyle(root);
            for (const token of tokens) {
              if (style.getPropertyValue(`--${token}`).trim() === '') {
                gaps.push(`${id} ${dark ? 'dark' : 'light'} --${token}`);
              }
            }
          }
        }
        root.dataset.theme = initialTheme;
        root.classList.toggle('dark', initialDark);
        return gaps;
      },
      { ids: [...selectableIds()], tokens: [...requiredTokens] },
    );
    assert.deepEqual(missing, []);
  },
);

Then('the motion example uses the preset base duration', async function (this: FrontendWorld) {
  const example = this.currentPage().getByRole('button', { name: 'Motion example' });
  const [actual, expected, foundation] = await example.evaluate((element) => {
    const probe = document.createElement('div');
    probe.style.transitionDuration = 'var(--motion-duration-base)';
    document.body.append(probe);
    const selected = getComputedStyle(probe).transitionDuration;
    const root = document.documentElement;
    const current = root.dataset.theme ?? '';
    root.dataset.theme = 'ds-01';
    const baseline = getComputedStyle(probe).transitionDuration;
    root.dataset.theme = current;
    probe.remove();
    return [getComputedStyle(element).transitionDuration.split(',')[0]?.trim(), selected, baseline];
  });
  assert.equal(actual, expected);
  assert.notEqual(expected, foundation);
});

When(
  'I request reduced motion and open the design system gallery',
  async function (this: FrontendWorld) {
    await this.currentPage().emulateMedia({ reducedMotion: 'reduce' });
    await this.currentPage().goto('/design-systems');
  },
);

Then(
  'the motion example has an effectively instant transition',
  async function (this: FrontendWorld) {
    const duration = await this.currentPage()
      .getByRole('button', { name: 'Motion example' })
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    assert.match(duration, /0\.00001s|1e-05s|0s/);
  },
);
