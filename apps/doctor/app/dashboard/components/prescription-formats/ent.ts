import type { FormatData } from './types';
import { buildSpecialtyHtml } from './gen-med';

export function entHtmlGenerator(data: FormatData): string {
  return buildSpecialtyHtml(data, {
    title: 'ENT (OTORHINOLARYNGOLOGY)',
    showWaist: false,
    showSurgical: true,
    showDrawing: false,
  });
}
