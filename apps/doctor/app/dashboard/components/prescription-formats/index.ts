import { genMedHtmlGenerator } from './gen-med';
import { genSurgHtmlGenerator } from './gen-surg';
import { entHtmlGenerator } from './ent';
import type { PrescriptionHtmlGenerator } from './types';

export type { FormatData, PrescriptionHtmlGenerator } from './types';

const FORMAT_RENDERERS: Record<string, PrescriptionHtmlGenerator> = {
  GEN_MED: genMedHtmlGenerator,
  GEN_SURG: genSurgHtmlGenerator,
  ENT: entHtmlGenerator,
};

export function getFormatRenderer(format: string): PrescriptionHtmlGenerator {
  return FORMAT_RENDERERS[format] || FORMAT_RENDERERS.GEN_MED;
}
