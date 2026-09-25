import { z } from 'zod';

export const designSystemIds = [
  'ds-01',
  'ds-02',
  'ds-03',
  'ds-04',
  'ds-05',
  'ds-06',
  'ds-07',
  'ds-08',
  'ds-09',
  'ds-10',
  'ds-11',
  'ds-12',
  'ds-13',
  'ds-14',
  'ds-15',
  'ds-16',
  'ds-17',
  'ds-18',
  'ds-19',
  'ds-20',
] as const;

export const designSystemIdSchema = z.enum(designSystemIds);

export const designSystemStatusSchema = z.enum(['open', 'exploring', 'preview-ready', 'approved']);

export const colorModeSchema = z.enum(['light', 'dark', 'system']);

export const designSystemPreferenceSchema = z.strictObject({
  preset: designSystemIdSchema,
  mode: colorModeSchema,
});

export type DesignSystemId = z.infer<typeof designSystemIdSchema>;
export type DesignSystemStatus = z.infer<typeof designSystemStatusSchema>;
export type ColorMode = z.infer<typeof colorModeSchema>;
export type DesignSystemPreference = z.infer<typeof designSystemPreferenceSchema>;
