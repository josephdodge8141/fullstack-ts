import { cn } from 'cn';

export function Typography({
  variant = 'body',
  className,
  children,
}: {
  readonly variant?:
    'display' | 'heading' | 'subheading' | 'body' | 'caption' | 'overline' | 'code';
  readonly className?: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  switch (variant) {
    case 'display':
      return (
        <h1
          data-slot="typography"
          className={cn('text-5xl font-semibold tracking-tight', className)}
        >
          {children}
        </h1>
      );
    case 'heading':
      return (
        <h2
          data-slot="typography"
          className={cn('text-3xl font-semibold tracking-tight', className)}
        >
          {children}
        </h2>
      );
    case 'subheading':
      return (
        <h3 data-slot="typography" className={cn('text-xl font-semibold', className)}>
          {children}
        </h3>
      );
    case 'caption':
      return (
        <span data-slot="typography" className={cn('text-xs text-muted-foreground', className)}>
          {children}
        </span>
      );
    case 'overline':
      return (
        <span
          data-slot="typography"
          className={cn(
            'text-xs font-semibold tracking-widest text-muted-foreground uppercase',
            className,
          )}
        >
          {children}
        </span>
      );
    case 'code':
      return (
        <code
          data-slot="typography"
          className={cn('rounded bg-muted px-1 font-mono text-sm', className)}
        >
          {children}
        </code>
      );
    case 'body':
      return (
        <p data-slot="typography" className={cn('text-base leading-7', className)}>
          {children}
        </p>
      );
  }
}

export function TextLink({ className, ...props }: React.ComponentProps<'a'>): React.JSX.Element {
  return (
    <a
      data-slot="text-link"
      className={cn(
        'text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      {...props}
    />
  );
}
