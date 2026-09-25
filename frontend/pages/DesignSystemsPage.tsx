import { useEffect, useState } from 'react';
import type { ColorMode, DesignSystemId, DesignSystemPreference } from '@app/schemas';
import {
  BellIcon,
  BoldIcon,
  ChevronDownIcon,
  InboxIcon,
  ItalicIcon,
  SearchIcon,
  UnderlineIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion.js';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog.js';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert.js';
import { Avatar, AvatarFallback, AvatarGroup } from '../components/ui/avatar.js';
import { Badge } from '../components/ui/badge.js';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb.js';
import { ButtonGroup } from '../components/ui/button-group.js';
import { Button } from '../components/ui/button.js';
import { Calendar } from '../components/ui/calendar.js';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart.js';
import { Checkbox } from '../components/ui/checkbox.js';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible.js';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../components/ui/combobox.js';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '../components/ui/command.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog.js';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../components/ui/drawer.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu.js';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../components/ui/empty.js';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '../components/ui/field.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/ui/hover-card.js';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '../components/ui/input-group.js';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp.js';
import { Input } from '../components/ui/input.js';
import { Kbd, KbdGroup } from '../components/ui/kbd.js';
import { Label } from '../components/ui/label.js';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from '../components/ui/menubar.js';
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select.js';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination.js';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '../components/ui/popover.js';
import { Progress } from '../components/ui/progress.js';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.js';
import { Separator } from '../components/ui/separator.js';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { Slider } from '../components/ui/slider.js';
import { Spinner } from '../components/ui/spinner.js';
import { Switch } from '../components/ui/switch.js';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';
import { Textarea } from '../components/ui/textarea.js';
import { Toaster, toast } from '../components/ui/toast.js';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group.js';
import { Toggle } from '../components/ui/toggle.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip.js';
import { Chip, Rating } from '../design-system/controls.js';
import { BottomNavigation, Stepper } from '../design-system/navigation.js';
import {
  colorTokens,
  designSystems,
  isSelectable,
  motionTokens,
  shapeTokens,
  typeTokens,
} from '../design-system/themes/registry.js';
import {
  applyDesignSystemPreference,
  prefersDark,
  readDesignSystemPreference,
  saveDesignSystemPreference,
} from '../design-system/themes/theme.js';

const colorGroups: readonly { readonly title: string; readonly tokens: readonly string[] }[] = [
  {
    title: 'Canvas and surfaces',
    tokens: ['background', 'card', 'popover', 'muted', 'secondary', 'accent', 'sidebar'],
  },
  {
    title: 'Text',
    tokens: ['foreground', 'muted-foreground', 'card-foreground', 'link'],
  },
  {
    title: 'Actions and status',
    tokens: ['primary', 'destructive', 'success', 'warning', 'info'],
  },
  {
    title: 'Boundaries and focus',
    tokens: ['border', 'input', 'ring', 'selection', 'overlay'],
  },
  {
    title: 'Data series',
    tokens: ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'],
  },
];

const foregroundFor: Readonly<Record<string, string>> = {
  primary: 'primary-foreground',
  secondary: 'secondary-foreground',
  muted: 'muted-foreground',
  accent: 'accent-foreground',
  destructive: 'destructive-foreground',
  success: 'success-foreground',
  warning: 'warning-foreground',
  info: 'info-foreground',
  card: 'card-foreground',
  popover: 'popover-foreground',
  background: 'foreground',
  sidebar: 'sidebar-foreground',
  selection: 'selection-foreground',
};

const typeScale: readonly { readonly label: string; readonly className: string }[] = [
  { label: 'Display', className: 'font-heading text-5xl' },
  { label: 'Heading 1', className: 'font-heading text-4xl' },
  { label: 'Heading 2', className: 'font-heading text-3xl' },
  { label: 'Heading 3', className: 'font-heading text-2xl' },
  { label: 'Title', className: 'text-xl font-medium' },
  { label: 'Body large', className: 'text-lg' },
  { label: 'Body', className: 'text-base' },
  { label: 'Small', className: 'text-sm' },
  { label: 'Caption', className: 'text-xs text-muted-foreground' },
];

const invoices: readonly {
  readonly id: string;
  readonly customer: string;
  readonly status: 'Paid' | 'Pending' | 'Overdue';
  readonly amount: string;
}[] = [
  { id: 'INV-1042', customer: 'Northwind Traders', status: 'Paid', amount: '$1,250.00' },
  { id: 'INV-1043', customer: 'Contoso Pharmaceuticals', status: 'Pending', amount: '$980.40' },
  {
    id: 'INV-1044',
    customer: 'Fabrikam Residences with an unusually long legal name',
    status: 'Overdue',
    amount: '$12,400.00',
  },
  { id: 'INV-1045', customer: 'Adventure Works', status: 'Paid', amount: '$310.00' },
];

const chartData = [
  { month: 'Jan', north: 186, south: 80, west: 120 },
  { month: 'Feb', north: 305, south: 200, west: 160 },
  { month: 'Mar', north: 237, south: 120, west: 190 },
  { month: 'Apr', north: 73, south: 190, west: 140 },
  { month: 'May', north: 209, south: 130, west: 220 },
  { month: 'Jun', north: 214, south: 140, west: 175 },
];

const chartConfig = {
  north: { label: 'North', color: 'var(--chart-1)' },
  south: { label: 'South', color: 'var(--chart-2)' },
  west: { label: 'West', color: 'var(--chart-3)' },
};

const frameworks = ['Astro', 'Next.js', 'Nuxt', 'Remix', 'SvelteKit', 'Vite'];

const regions = [
  { label: 'North America', value: 'na' },
  { label: 'Europe', value: 'eu' },
  { label: 'Asia Pacific', value: 'apac' },
];

const statusBadgeClass: Readonly<Record<(typeof invoices)[number]['status'], string>> = {
  Paid: 'bg-success text-success-foreground',
  Pending: 'bg-warning text-warning-foreground',
  Overdue: 'bg-destructive text-destructive-foreground',
};

function Section({
  id,
  title,
  description,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section aria-labelledby={`${id}-heading`} className="scroll-mt-6 space-y-6">
      <div className="space-y-1 border-b pb-3">
        <h2 id={`${id}-heading`} className="text-2xl">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Specimen({
  title,
  children,
  className = '',
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div
      className={`min-w-0 rounded-xl border bg-card p-5 text-card-foreground shadow-xs ${className}`}
    >
      <h3 className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

function useResolvedTokens(
  tokens: readonly string[],
  signature: string,
): Readonly<Record<string, string>> {
  const [values, setValues] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const token of tokens) next[token] = style.getPropertyValue(`--${token}`).trim();
    setValues(next);
  }, [tokens, signature]);
  return values;
}

const allTokens = [...colorTokens, ...typeTokens, ...shapeTokens, ...motionTokens];

export function DesignSystemsPage(): React.JSX.Element {
  const [preference, setPreference] = useState<DesignSystemPreference>(() =>
    readDesignSystemPreference(window.localStorage),
  );
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [moved, setMoved] = useState(false);
  const [staggered, setStaggered] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(4);
  const [chips, setChips] = useState<readonly string[]>(['Design', 'Research', 'Engineering']);
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 8, 25));
  const [step, setStep] = useState(1);
  const [bottomNav, setBottomNav] = useState('home');
  const [email, setEmail] = useState('not-an-email');
  const [command, setCommand] = useState('');

  useEffect(() => {
    applyDesignSystemPreference(document.documentElement, preference);
    saveDesignSystemPreference(window.localStorage, preference);
  }, [preference, systemDark]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent): void => setSystemDark(event.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const signature = `${preference.preset}:${preference.mode}:${String(systemDark)}`;
  const resolved = useResolvedTokens(allTokens, signature);
  const active = designSystems.find((brief) => brief.id === preference.preset);
  const emailInvalid = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const choosePreset = (preset: DesignSystemId): void =>
    setPreference((previous) => {
      const brief = designSystems.find((entry) => entry.id === preset);
      if (previous.explicitMode || brief === undefined) return { ...previous, preset };
      return { ...previous, preset, mode: brief.defaultMode };
    });
  const chooseMode = (mode: ColorMode): void =>
    setPreference((previous) => ({ ...previous, mode, explicitMode: true }));

  return (
    <Toaster>
      <div className="min-h-screen lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
          <div className="space-y-6 p-5">
            <div className="space-y-1">
              <a
                className="text-xs underline-offset-4 opacity-80 hover:underline"
                href="/components"
              >
                Component catalog
              </a>
              <h1 className="text-2xl">Design systems</h1>
              <p className="text-sm opacity-80">
                Pick a preset to reskin the entire component library.
              </p>
            </div>

            <div className="space-y-2">
              <p id="color-mode-label" className="text-xs font-medium tracking-wide uppercase">
                Color mode
              </p>
              <div
                role="radiogroup"
                aria-labelledby="color-mode-label"
                className="grid grid-cols-3 gap-1 rounded-lg bg-sidebar-accent p-1"
              >
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <label
                    key={mode}
                    className="relative cursor-pointer rounded-md px-2 py-1.5 text-center text-sm capitalize transition-colors has-checked:bg-sidebar-primary has-checked:text-sidebar-primary-foreground has-focus-visible:ring-2 has-focus-visible:ring-sidebar-ring"
                  >
                    <input
                      className="absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0"
                      type="radio"
                      name="color-mode"
                      value={mode}
                      checked={preference.mode === mode}
                      onChange={() => chooseMode(mode)}
                      aria-label={mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'}
                    />
                    {mode}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p id="design-system-label" className="text-xs font-medium tracking-wide uppercase">
                Design system
              </p>
              <div role="radiogroup" aria-labelledby="design-system-label" className="space-y-1">
                {designSystems.map((brief) => {
                  const selectable = isSelectable(brief);
                  return (
                    <label
                      key={brief.id}
                      className={`relative flex items-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors has-checked:border-sidebar-border has-checked:bg-sidebar-accent has-checked:text-sidebar-accent-foreground has-focus-visible:ring-2 has-focus-visible:ring-sidebar-ring ${
                        selectable
                          ? 'cursor-pointer hover:bg-sidebar-accent/60'
                          : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <input
                        className="absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
                        type="radio"
                        name="design-system"
                        value={brief.id}
                        checked={preference.preset === brief.id}
                        disabled={!selectable}
                        onChange={() => choosePreset(brief.id)}
                        aria-label={brief.name}
                        aria-describedby={`${brief.id}-description`}
                      />
                      <span className="mt-0.5 font-mono text-xs opacity-70">{brief.slot}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {selectable ? brief.name : 'Open slot'}
                        </span>
                        <span id={`${brief.id}-description`} className="block text-xs opacity-75">
                          {selectable
                            ? `${brief.defaultMode === 'dark' ? 'Dark-first · ' : ''}${brief.keywords.join(' · ')}`
                            : 'Not yet briefed'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-16 px-5 py-10 sm:px-10">
          <header className="space-y-4">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {active?.slot} · {active?.status}
            </p>
            <p className="font-heading text-5xl leading-tight">{active?.name}</p>
            <p className="max-w-2xl text-lg text-muted-foreground">{active?.experience}</p>
            <div className="flex flex-wrap gap-2">
              {active?.keywords.map((keyword) => (
                <Badge key={keyword} variant="outline">
                  {keyword}
                </Badge>
              ))}
            </div>
            <dl className="grid max-w-3xl gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Audience</dt>
                <dd>{active?.audience}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Display</dt>
                <dd className="font-heading">{active?.typography?.display}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Body</dt>
                <dd>{active?.typography?.body}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mono</dt>
                <dd className="font-mono">{active?.typography?.mono}</dd>
              </div>
            </dl>
          </header>

          <Section
            id="foundations"
            title="Foundations"
            description="Color, typography, shape and elevation tokens resolved from the active preset."
          >
            <div className="space-y-6">
              {colorGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h3 className="text-sm font-medium">{group.title}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {group.tokens.map((token) => {
                      const pair = foregroundFor[token];
                      return (
                        <div key={token} className="overflow-hidden rounded-lg border">
                          <div
                            className="flex h-16 items-end p-2 text-sm font-medium"
                            style={{
                              backgroundColor: `var(--${token})`,
                              color: pair === undefined ? undefined : `var(--${pair})`,
                            }}
                          >
                            {pair === undefined ? '' : 'Aa'}
                          </div>
                          <div className="space-y-0.5 bg-card p-2">
                            <p className="font-mono text-xs">--{token}</p>
                            <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
                              {resolved[token]}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Type scale">
                <div className="space-y-3">
                  {typeScale.map((entry) => (
                    <div key={entry.label} className="flex items-baseline gap-4">
                      <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                        {entry.label}
                      </span>
                      <span className={`min-w-0 truncate ${entry.className}`}>
                        The quick brown fox
                      </span>
                    </div>
                  ))}
                </div>
              </Specimen>
              <Specimen title="Font roles">
                <div className="space-y-5">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Display</p>
                    <p className="font-heading text-3xl">Sphinx of black quartz, judge my vow.</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Body</p>
                    <p className="max-w-prose">
                      Good typography is invisible until it is missing. Body copy sets the reading
                      rhythm for dense product screens, long-form documentation and settings pages
                      alike. <a className="text-link underline underline-offset-4">Inline link</a>{' '}
                      and <strong>strong emphasis</strong> stay legible.
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Mono and numerals</p>
                    <p className="font-mono text-sm tabular-nums">
                      0123456789 · $12,400.00 · 2026-09-25T14:30Z · {'const x = a ?? b;'}
                    </p>
                  </div>
                </div>
              </Specimen>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Radius">
                <div className="flex flex-wrap items-end gap-4">
                  {['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl'].map(
                    (radius) => (
                      <div key={radius} className="space-y-2 text-center">
                        <div className={`size-16 border-2 border-primary bg-muted ${radius}`} />
                        <p className="font-mono text-xs">{radius}</p>
                      </div>
                    ),
                  )}
                </div>
              </Specimen>
              <Specimen title="Elevation">
                <div className="flex flex-wrap items-end gap-5">
                  {['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl'].map(
                    (shadow) => (
                      <div key={shadow} className="space-y-2 text-center">
                        <div className={`size-16 rounded-lg border bg-card ${shadow}`} />
                        <p className="font-mono text-xs">{shadow}</p>
                      </div>
                    ),
                  )}
                </div>
              </Specimen>
            </div>
          </Section>

          <Section
            id="actions"
            title="Actions"
            description="Buttons, toggles and groups across variants, sizes and states."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Variants">
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </Specimen>
              <Specimen title="Sizes and states">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra small</Button>
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" aria-label="Notifications">
                    <BellIcon />
                  </Button>
                  <Button disabled>Disabled</Button>
                  <Button
                    disabled={loading}
                    onClick={() => {
                      setLoading(true);
                      window.setTimeout(() => setLoading(false), 1500);
                    }}
                  >
                    {loading ? <Spinner /> : null}
                    {loading ? 'Saving' : 'Save changes'}
                  </Button>
                </div>
              </Specimen>
              <Specimen title="Groups and toggles">
                <div className="flex flex-wrap items-center gap-4">
                  <ButtonGroup aria-label="Pager">
                    <Button variant="outline">Previous</Button>
                    <Button variant="outline">Current</Button>
                    <Button variant="outline">Next</Button>
                  </ButtonGroup>
                  <Toggle aria-label="Toggle bold">
                    <BoldIcon />
                  </Toggle>
                  <ToggleGroup variant="outline" aria-label="Text formatting" multiple>
                    <ToggleGroupItem value="bold" aria-label="Bold">
                      <BoldIcon />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Italic">
                      <ItalicIcon />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Underline">
                      <UnderlineIcon />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </Specimen>
              <Specimen title="Shortcuts and chips">
                <div className="flex flex-wrap items-center gap-3">
                  <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                  </KbdGroup>
                  {chips.map((chip) => (
                    <Chip
                      key={chip}
                      label={chip}
                      onRemove={() => setChips(chips.filter((item) => item !== chip))}
                    />
                  ))}
                  <Chip label="Locked" disabled />
                </div>
              </Specimen>
            </div>
          </Section>

          <Section
            id="inputs"
            title="Inputs"
            description="Text, choice and range inputs with hints, validation and disabled states."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Text fields">
                <div className="space-y-5">
                  <Field>
                    <FieldLabel htmlFor="ds-name">Full name</FieldLabel>
                    <Input id="ds-name" placeholder="Ada Lovelace" />
                    <FieldDescription>As it appears on official documents.</FieldDescription>
                  </Field>
                  <Field data-invalid={emailInvalid}>
                    <FieldLabel htmlFor="ds-email">Email</FieldLabel>
                    <Input
                      id="ds-email"
                      type="email"
                      value={email}
                      aria-invalid={emailInvalid}
                      onChange={(event) => setEmail(event.currentTarget.value)}
                    />
                    {emailInvalid ? <FieldError>Enter a valid email address.</FieldError> : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-search">Search</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <SearchIcon />
                      </InputGroupAddon>
                      <InputGroupInput id="ds-search" placeholder="Search projects" />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>12 results</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-disabled">Disabled</FieldLabel>
                    <Input id="ds-disabled" disabled value="Read-only value" readOnly />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-notes">Notes</FieldLabel>
                    <Textarea id="ds-notes" placeholder="Share context for reviewers" />
                  </Field>
                </div>
              </Specimen>
              <Specimen title="Choices">
                <div className="space-y-5">
                  <Field>
                    <FieldLabel>Region</FieldLabel>
                    <Select items={regions} defaultValue="eu">
                      <SelectTrigger className="w-56" aria-label="Region">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-framework">Framework</FieldLabel>
                    <Combobox items={frameworks}>
                      <ComboboxInput id="ds-framework" placeholder="Choose a framework" />
                      <ComboboxContent>
                        <ComboboxEmpty>No framework found.</ComboboxEmpty>
                        <ComboboxList>
                          {(item: string) => (
                            <ComboboxItem key={item} value={item}>
                              {item}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="ds-timezone">Time zone</FieldLabel>
                    <NativeSelect id="ds-timezone" defaultValue="utc">
                      <NativeSelectOption value="utc">UTC</NativeSelectOption>
                      <NativeSelectOption value="est">Eastern</NativeSelectOption>
                      <NativeSelectOption value="pst">Pacific</NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <FieldSet>
                    <FieldLegend>Plan</FieldLegend>
                    <RadioGroup defaultValue="team" aria-label="Plan">
                      {['Starter', 'Team', 'Enterprise'].map((plan) => (
                        <div key={plan} className="flex items-center gap-2">
                          <RadioGroupItem value={plan.toLowerCase()} id={`ds-plan-${plan}`} />
                          <Label htmlFor={`ds-plan-${plan}`}>{plan}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FieldSet>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox id="ds-terms" defaultChecked />
                      <Label htmlFor="ds-terms">Accept terms</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="ds-disabled-check" disabled />
                      <Label htmlFor="ds-disabled-check">Unavailable</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="ds-alerts" defaultChecked />
                      <Label htmlFor="ds-alerts">Alerts</Label>
                    </div>
                  </div>
                </div>
              </Specimen>
              <Specimen title="Range, code and rating">
                <div className="space-y-6">
                  <Field>
                    <FieldLabel>Volume</FieldLabel>
                    <Slider defaultValue={[60]} aria-label="Volume" />
                  </Field>
                  <Field>
                    <FieldLabel>Verification code</FieldLabel>
                    <InputOTP maxLength={6} aria-label="Verification code">
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </Field>
                  <Rating label="Satisfaction" value={rating} onChange={setRating} />
                </div>
              </Specimen>
              <Specimen title="Calendar">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-lg border"
                />
              </Specimen>
            </div>
          </Section>

          <Section
            id="navigation"
            title="Navigation"
            description="Wayfinding across tabs, menus, breadcrumbs, pagination and steps."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Tabs">
                <Tabs defaultValue="overview">
                  <TabsList aria-label="Project sections">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="pt-3 text-sm">
                    Overview content for the selected project.
                  </TabsContent>
                  <TabsContent value="activity" className="pt-3 text-sm">
                    Recent activity appears here.
                  </TabsContent>
                  <TabsContent value="settings" className="pt-3 text-sm">
                    Project settings live here.
                  </TabsContent>
                </Tabs>
                <Separator className="my-5" />
                <Tabs defaultValue="week">
                  <TabsList variant="line" aria-label="Range">
                    <TabsTrigger value="day">Day</TabsTrigger>
                    <TabsTrigger value="week">Week</TabsTrigger>
                    <TabsTrigger value="month">Month</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Specimen>
              <Specimen title="Breadcrumb and pagination">
                <div className="space-y-5">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Workspace</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink href="#">Projects</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Design systems</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#">1</PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink href="#" isActive>
                          2
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext href="#" />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </Specimen>
              <Specimen title="Menus">
                <div className="flex flex-wrap items-center gap-4">
                  <Menubar>
                    <MenubarMenu>
                      <MenubarTrigger>File</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>
                          New tab <MenubarShortcut>⌘T</MenubarShortcut>
                        </MenubarItem>
                        <MenubarItem>New window</MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem>Share</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                    <MenubarMenu>
                      <MenubarTrigger>Edit</MenubarTrigger>
                      <MenubarContent>
                        <MenubarItem>Undo</MenubarItem>
                        <MenubarItem>Redo</MenubarItem>
                      </MenubarContent>
                    </MenubarMenu>
                  </Menubar>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" />}>
                      Options <ChevronDownIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>My account</DropdownMenuLabel>
                        <DropdownMenuItem>
                          Profile <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Billing</DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem defaultChecked>
                        Show status bar
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">Delete project</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Specimen>
              <Specimen title="Command palette">
                <Command className="rounded-lg border" value={command} onValueChange={setCommand}>
                  <CommandInput placeholder="Type a command or search" />
                  <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                      <CommandItem>
                        Calendar <CommandShortcut>⌘C</CommandShortcut>
                      </CommandItem>
                      <CommandItem>Search emoji</CommandItem>
                      <CommandItem>Calculator</CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </Specimen>
              <Specimen title="Steps and bottom navigation" className="xl:col-span-2">
                <div className="space-y-6">
                  <Stepper
                    steps={[
                      { id: 'account', label: 'Account' },
                      { id: 'profile', label: 'Profile' },
                      { id: 'review', label: 'Review' },
                    ]}
                    activeIndex={step}
                    onStepChange={setStep}
                  />
                  <BottomNavigation
                    label="Mobile sections"
                    items={[
                      { id: 'home', label: 'Home' },
                      { id: 'search', label: 'Search' },
                      { id: 'profile', label: 'Profile' },
                    ]}
                    value={bottomNav}
                    onChange={setBottomNav}
                  />
                </div>
              </Specimen>
            </div>
          </Section>

          <Section
            id="overlays"
            title="Overlays"
            description="Portaled surfaces inherit the preset from the document root."
          >
            <Specimen title="Triggers">
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger render={<Button />}>Open preset dialog</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Preset dialog</DialogTitle>
                      <DialogDescription>
                        Surfaces, borders, radius, elevation and motion all come from the preset.
                      </DialogDescription>
                    </DialogHeader>
                    <Field>
                      <FieldLabel htmlFor="ds-dialog-name">Project name</FieldLabel>
                      <Input id="ds-dialog-name" defaultValue="Aurora" />
                    </Field>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                      <DialogClose render={<Button />}>Save</DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="destructive" />}>
                    Delete project
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the project and its history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>Refine the visible records.</SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
                <Drawer>
                  <DrawerTrigger render={<Button variant="outline" />}>Open drawer</DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Quick actions</DrawerTitle>
                      <DrawerDescription>A mobile-first bottom surface.</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" />}>
                    Open popover
                  </PopoverTrigger>
                  <PopoverContent>
                    <PopoverHeader>
                      <PopoverTitle>Dimensions</PopoverTitle>
                      <PopoverDescription>Set the layer size.</PopoverDescription>
                    </PopoverHeader>
                  </PopoverContent>
                </Popover>
                <HoverCard>
                  <HoverCardTrigger render={<Button variant="link" />}>@design</HoverCardTrigger>
                  <HoverCardContent>
                    <p className="text-sm">The design team shares tokens across twenty presets.</p>
                  </HoverCardContent>
                </HoverCard>
                <Tooltip>
                  <TooltipTrigger render={<Button variant="ghost" />}>
                    Hover for tooltip
                  </TooltipTrigger>
                  <TooltipContent>Tooltips use inverted surface tokens</TooltipContent>
                </Tooltip>
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast.add({
                      title: 'Changes saved',
                      description: `${active?.name ?? 'Preset'} toast rendered from the preset.`,
                    })
                  }
                >
                  Show toast
                </Button>
              </div>
            </Specimen>
          </Section>

          <Section
            id="data"
            title="Data display"
            description="Cards, tables, charts, status and loading, empty and error states."
          >
            <div className="grid gap-6 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly revenue</CardTitle>
                  <CardDescription>Across all regions</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">+12.5%</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="font-heading text-4xl tabular-nums">$45,231.89</p>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">Updated just now</CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                  <CardDescription>Five active collaborators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AvatarGroup>
                    {['AL', 'GH', 'KJ', 'MW'].map((initials) => (
                      <Avatar key={initials}>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Storage</CardTitle>
                  <CardDescription>68% of 100 GB used</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={68} aria-label="Storage used" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Specimen title="Table">
              <Table>
                <TableCaption>Recent invoices with long content and status colors.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.id}</TableCell>
                      <TableCell className="max-w-64 truncate">{invoice.customer}</TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass[invoice.status]}>{invoice.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{invoice.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Specimen>

            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Chart">
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="north" fill="var(--color-north)" radius={4} />
                    <Bar dataKey="south" fill="var(--color-south)" radius={4} />
                    <Bar dataKey="west" fill="var(--color-west)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </Specimen>
              <Specimen title="Alerts">
                <div className="space-y-3">
                  <Alert>
                    <AlertTitle>Heads up</AlertTitle>
                    <AlertDescription>Default alerts use card surfaces.</AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <AlertTitle>Payment failed</AlertTitle>
                    <AlertDescription>Update the card on file to continue.</AlertDescription>
                  </Alert>
                  <Alert className="border-success/40 bg-success/10 text-success">
                    <AlertTitle>Deployment complete</AlertTitle>
                    <AlertDescription>All checks passed in 2m 14s.</AlertDescription>
                  </Alert>
                  <Alert className="border-warning/50 bg-warning/15">
                    <AlertTitle>Quota nearly reached</AlertTitle>
                    <AlertDescription>
                      You have used 92% of this month&apos;s builds.
                    </AlertDescription>
                  </Alert>
                  <Alert className="border-info/40 bg-info/10 text-info">
                    <AlertTitle>Scheduled maintenance</AlertTitle>
                    <AlertDescription>Sunday 02:00 to 03:00 UTC.</AlertDescription>
                  </Alert>
                </div>
              </Specimen>
              <Specimen title="Disclosure">
                <Accordion defaultValue={['tokens']}>
                  <AccordionItem value="tokens">
                    <AccordionTrigger>What is a design token?</AccordionTrigger>
                    <AccordionContent>
                      A named value such as a color, font or duration that components consume.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="presets">
                    <AccordionTrigger>How do presets differ?</AccordionTrigger>
                    <AccordionContent>
                      Mostly through typography and color, with restrained shape and motion accents.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Collapsible className="mt-4 rounded-lg border p-3">
                  <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>
                    Toggle details <ChevronDownIcon />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
                    Collapsible content uses the preset slow duration.
                  </CollapsibleContent>
                </Collapsible>
              </Specimen>
              <Specimen title="Empty state">
                <Empty className="border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InboxIcon />
                    </EmptyMedia>
                    <EmptyTitle>No messages yet</EmptyTitle>
                    <EmptyDescription>New conversations will appear here.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button size="sm">Start a conversation</Button>
                  </EmptyContent>
                </Empty>
              </Specimen>
            </div>
          </Section>

          <Section
            id="motion"
            title="Motion"
            description="Duration, easing, distance and stagger tokens. Reduced motion collapses them."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <Specimen title="Motion tokens">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  {motionTokens.map((token) => (
                    <div key={token} className="contents">
                      <dt className="font-mono text-xs text-muted-foreground">--{token}</dt>
                      <dd className="truncate font-mono text-xs">{resolved[token]}</dd>
                    </div>
                  ))}
                </dl>
              </Specimen>
              <Specimen title="Travel and easing">
                <div className="space-y-5">
                  <div className="relative h-12 rounded-lg bg-muted">
                    <span
                      aria-hidden="true"
                      className="absolute top-2 left-2 size-8 rounded-md bg-primary shadow-md transition-[translate] duration-(--motion-duration-slow) ease-(--motion-ease-emphasized)"
                      style={{ translate: moved ? 'calc(100% * 6)' : '0' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="transition hover:-translate-y-(--motion-distance)"
                      onClick={() => setMoved((previous) => !previous)}
                    >
                      Motion example
                    </Button>
                    <Button variant="outline" onClick={() => setStaggered((previous) => !previous)}>
                      Replay stagger
                    </Button>
                  </div>
                  <ul className="grid grid-cols-5 gap-2" aria-label="Staggered items">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <li
                        key={index}
                        className="h-10 rounded-md bg-accent transition-[opacity,translate] duration-(--motion-duration-slow) ease-(--motion-ease-enter)"
                        style={{
                          opacity: staggered ? 1 : 0,
                          translate: staggered ? '0' : '0 var(--motion-distance)',
                          transitionDelay: `calc(var(--motion-stagger) * ${String(index)})`,
                        }}
                      />
                    ))}
                  </ul>
                </div>
              </Specimen>
            </div>
          </Section>
        </main>
      </div>
    </Toaster>
  );
}
