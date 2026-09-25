import { useState } from 'react';

import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.js';

export function ComponentCatalogPage(): React.JSX.Element {
  const [name, setName] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <a className="text-sm underline underline-offset-4" href="/">
          Back to starter
        </a>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Component library</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A small interaction sample from the pinned shadcn/ui foundation. The full source catalog
          is bundled with the starter.
        </p>
      </div>

      <Tabs defaultValue="actions">
        <TabsList aria-label="Component examples">
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
        </TabsList>
        <TabsContent value="actions" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions and dialog</CardTitle>
              <CardDescription>Keyboard focus, dismissal, and disabled state.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger render={<Button />}>Open example dialog</DialogTrigger>
                <DialogContent showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>Example dialog</DialogTitle>
                    <DialogDescription>
                      This dialog is part of the bundled component foundation.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogClose render={<Button autoFocus />}>Close</DialogClose>
                </DialogContent>
              </Dialog>
              <Button disabled>Unavailable action</Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fields" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fields</CardTitle>
              <CardDescription>A labeled input and its local value.</CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-md gap-2">
              <Label htmlFor="example-name">Name</Label>
              <Input
                id="example-name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                placeholder="Enter a name"
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {name === '' ? 'No name entered' : `Hello, ${name}`}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <nav aria-label="More component examples" className="grid gap-3 sm:grid-cols-2">
        {[
          ['Data workspace', '/components/data'],
          ['Organization patterns', '/components/organization'],
          ['Input patterns', '/components/inputs'],
          ['Workspace layout', '/components/layouts'],
          ['Page layout gallery', '/components/layout-gallery'],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="rounded-lg border p-4 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          >
            {label}
          </a>
        ))}
      </nav>
    </main>
  );
}
