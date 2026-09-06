import { z } from 'zod';

const applicationName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const hostedZoneId = /^Z[A-Z0-9]{5,31}$/;
const dnsName = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const foundationConfigSchema = z
  .object({
    applicationName: z.string().min(1).max(40).regex(applicationName),
    previewZoneId: z.string().regex(hostedZoneId),
    previewZoneName: z.string().regex(dnsName),
  })
  .strict();

export type FoundationConfig = z.infer<typeof foundationConfigSchema>;

export const exampleFoundationConfig: FoundationConfig = {
  applicationName: 'example-app',
  previewZoneId: 'Z0123456789EXAMPLE',
  previewZoneName: 'preview.example.com',
};

export function parseFoundationConfig(value: unknown): FoundationConfig {
  return foundationConfigSchema.parse(value);
}
