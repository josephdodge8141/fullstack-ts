import { useState } from 'react';

import { Button } from '../components/ui/button.js';
import { DataGrid, type DataGridColumn } from '../design-system/data-grid.js';
import {
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  TimePicker,
} from '../design-system/date-picker.js';
import {
  Box,
  Container,
  Grid,
  ImageList,
  Masonry,
  PageHeader,
  Paper,
  Stack,
  Timeline,
  WorkspaceLayout,
} from '../design-system/layout.js';
import { BottomNavigation, Stepper } from '../design-system/navigation.js';
import {
  MarketingLayout,
  DocumentationLayout,
  DashboardLayout,
  DetailLayout,
  EditorLayout,
  InboxLayout,
  GalleryLayout,
  FormLayout,
  StatusLayout,
} from '../design-system/page-patterns.js';
import { Rating, Chip, SpeedDial } from '../design-system/controls.js';
import { TextareaAutosize } from '../design-system/textarea-autosize.js';
import { TransferList } from '../design-system/transfer-list.js';
import { TreeView, type TreeNode } from '../design-system/tree-view.js';
import { TextLink, Typography } from '../design-system/typography.js';

interface ExampleRow {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly score: number;
}

const rows: readonly ExampleRow[] = [
  { id: 'gamma', name: 'Gamma', category: 'Research', score: 83 },
  { id: 'alpha', name: 'Alpha', category: 'Design', score: 91 },
  { id: 'beta', name: 'Beta', category: 'Engineering', score: 76 },
];

const columns: readonly DataGridColumn<ExampleRow>[] = [
  { id: 'name', label: 'Name', value: (row) => row.name },
  { id: 'category', label: 'Category', value: (row) => row.category },
  { id: 'score', label: 'Score', value: (row) => row.score },
];

const tree: readonly TreeNode[] = [
  {
    id: 'projects',
    label: 'Projects',
    children: [
      { id: 'design', label: 'Design files' },
      { id: 'notes', label: 'Notes' },
    ],
  },
  { id: 'archive', label: 'Archive' },
];

export function ComponentSystemPage(): React.JSX.Element {
  const [selectedNode, setSelectedNode] = useState('');
  const [transferred, setTransferred] = useState<readonly string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [range, setRange] = useState({ start: '', end: '' });
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [navigation, setNavigation] = useState('overview');
  const [step, setStep] = useState(1);
  const [chips, setChips] = useState<readonly string[]>(['Active', 'Review']);
  const view = window.location.pathname.split('/').at(-1);

  if (view === 'layout-gallery') {
    return (
      <Container className="space-y-8 py-10">
        <PageHeader
          title="Page layout gallery"
          description="Responsive page structures using the same semantic tokens."
        />
        <Paper>
          <MarketingLayout header={<h2 className="font-semibold">Marketing layout</h2>}>
            <p>A public introduction with room for a hero and sections.</p>
          </MarketingLayout>
        </Paper>
        <Paper>
          <DocumentationLayout
            header={<h2 className="font-semibold">Documentation layout</h2>}
            sidebar={<span>Topics</span>}
          >
            <p>Article content and topic navigation.</p>
          </DocumentationLayout>
        </Paper>
        <Paper>
          <DashboardLayout header={<h2 className="font-semibold">Dashboard layout</h2>}>
            <span>Metric one</span>
            <span>Metric two</span>
          </DashboardLayout>
        </Paper>
        <Paper>
          <DetailLayout
            header={<h2 className="font-semibold">Detail layout</h2>}
            aside={<span>Metadata</span>}
          >
            <p>Record content.</p>
          </DetailLayout>
        </Paper>
        <Paper>
          <EditorLayout
            header={<h2 className="font-semibold">Editor layout</h2>}
            tools={<span>Tools</span>}
          >
            <p>Editable content.</p>
          </EditorLayout>
        </Paper>
        <Paper>
          <InboxLayout
            header={<h2 className="font-semibold">Inbox layout</h2>}
            list={<span>Messages</span>}
          >
            <p>Selected message.</p>
          </InboxLayout>
        </Paper>
        <Paper>
          <GalleryLayout header={<h2 className="font-semibold">Gallery layout</h2>}>
            <span>Image one</span>
            <span>Image two</span>
          </GalleryLayout>
        </Paper>
        <Paper>
          <FormLayout
            header={<h2 className="font-semibold">Form layout</h2>}
            actions={<Button>Save</Button>}
          >
            <p>Form fields and actions.</p>
          </FormLayout>
        </Paper>
        <Paper>
          <StatusLayout
            title="Status layout"
            description="Empty, error, loading, and success states can use this structure."
          />
        </Paper>
      </Container>
    );
  }

  if (view === 'data') {
    return (
      <Container className="py-10">
        <PageHeader
          title="Data workspace"
          description="Search, sort, select, paginate, and choose columns."
        />
        <div className="mt-8">
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            searchText={(row) => `${row.name} ${row.category} ${row.score}`}
            rowLabel={(row) => row.name}
            pageSize={2}
          />
        </div>
      </Container>
    );
  }

  if (view === 'organization') {
    return (
      <Container className="space-y-8 py-10">
        <PageHeader
          title="Organization patterns"
          description="Tree navigation and transfer between collections."
        />
        <Grid columns={2}>
          <Paper>
            <Typography variant="subheading">Tree view</Typography>
            <div className="mt-4">
              <TreeView
                nodes={tree}
                label="Project files"
                selectedId={selectedNode}
                onSelect={(node) => setSelectedNode(node.id)}
              />
            </div>
            <p className="mt-3 text-sm" aria-live="polite">
              Selected:{' '}
              {selectedNode === 'design'
                ? 'Design files'
                : selectedNode === 'notes'
                  ? 'Notes'
                  : selectedNode === 'projects'
                    ? 'Projects'
                    : selectedNode === 'archive'
                      ? 'Archive'
                      : 'None'}
            </p>
          </Paper>
          <Paper>
            <Typography variant="subheading">Transfer list</Typography>
            <div className="mt-4">
              <TransferList
                items={[
                  { id: 'a', label: 'Available A' },
                  { id: 'b', label: 'Available B' },
                  { id: 'c', label: 'Available C', disabled: true },
                ]}
                selectedIds={transferred}
                onChange={setTransferred}
              />
            </div>
          </Paper>
        </Grid>
      </Container>
    );
  }

  if (view === 'inputs') {
    return (
      <Container className="space-y-8 py-10">
        <PageHeader title="Input patterns" description="Dates, times, ratings, and growing text." />
        <Grid columns={2}>
          <Paper className="space-y-5">
            <DatePicker
              id="appointment"
              label="Appointment date"
              value={date}
              onChange={setDate}
              min="2026-01-01"
              max="2026-12-31"
            />
            <TimePicker
              id="appointment-time"
              label="Appointment time"
              value={time}
              onChange={setTime}
            />
            <DateTimePicker
              id="appointment-date-time"
              label="Date and time"
              value={dateTime}
              onChange={setDateTime}
            />
            <DateRangePicker id="travel" start={range.start} end={range.end} onChange={setRange} />
          </Paper>
          <Paper className="space-y-5">
            <Typography variant="subheading">Rating</Typography>
            <Rating label="Experience rating" value={rating} onChange={setRating} />
            <Typography variant="subheading">Growing notes</Typography>
            <label htmlFor="growing-notes" className="block text-sm">
              Notes
            </label>
            <TextareaAutosize id="growing-notes" value={notes} onChange={setNotes} />
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  onRemove={() => setChips(chips.filter((item) => item !== chip))}
                />
              ))}
            </div>
          </Paper>
        </Grid>
      </Container>
    );
  }

  return (
    <WorkspaceLayout
      header={
        <Container className="flex min-h-14 items-center justify-between gap-3">
          <strong>Workspace layouts</strong>
          <TextLink href="/components">Component catalog</TextLink>
        </Container>
      }
      navigation={
        <BottomNavigation
          label="Workspace sections"
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity' },
            { id: 'settings', label: 'Settings' },
          ]}
          value={navigation}
          onChange={setNavigation}
        />
      }
      toolbar={
        <Stepper
          steps={[
            { id: 'setup', label: 'Setup' },
            { id: 'review', label: 'Review' },
            { id: 'finish', label: 'Finish' },
          ]}
          activeIndex={step}
          onStepChange={setStep}
        />
      }
      detail={
        <Paper>
          <Typography variant="subheading">Detail pane</Typography>
          <Typography>Secondary information stays legible at narrow widths.</Typography>
        </Paper>
      }
    >
      <Stack className="mb-5 items-start justify-between" direction="responsive">
        <PageHeader
          title="Workspace layouts"
          description="A shell with navigation, toolbar, content and detail."
        />
        <SpeedDial
          label="Create item"
          icon={<span aria-hidden="true">+</span>}
          actions={[
            {
              id: 'new',
              label: 'New item',
              icon: <span aria-hidden="true">＋</span>,
              onClick: () => setStep(0),
            },
          ]}
        />
      </Stack>
      <Grid columns={3}>
        <Paper>
          <Typography variant="subheading">Dashboard</Typography>
          <Typography>Cards organize summary content.</Typography>
        </Paper>
        <Paper>
          <Typography variant="subheading">Editor</Typography>
          <Typography>Forms can use the same shell.</Typography>
        </Paper>
        <Paper>
          <Typography variant="subheading">Settings</Typography>
          <Typography>Detail panels adapt to the viewport.</Typography>
        </Paper>
      </Grid>
      <Box className="mt-8">
        <Typography variant="subheading">Masonry</Typography>
        <Masonry className="mt-3">
          <Paper>Short item</Paper>
          <Paper>
            Longer item with enough text to create a different height and show how the masonry flow
            responds to content.
          </Paper>
          <Paper>Third item</Paper>
        </Masonry>
      </Box>
      <Box className="mt-8">
        <Typography variant="subheading">Image list</Typography>
        <ImageList className="mt-3">
          {['One', 'Two', 'Three', 'Four'].map((label) => (
            <li key={label} className="aspect-square rounded-lg bg-muted p-3">
              {label}
            </li>
          ))}
        </ImageList>
      </Box>
      <Box className="mt-8">
        <Typography variant="subheading">Timeline</Typography>
        <Timeline className="mt-3">
          <li>Created</li>
          <li>Reviewed</li>
          <li>Published</li>
        </Timeline>
      </Box>
      <Button className="mt-6" onClick={() => setStep((previous) => Math.min(previous + 1, 2))}>
        Next step
      </Button>
    </WorkspaceLayout>
  );
}
