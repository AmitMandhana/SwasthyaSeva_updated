import type { FormatData } from './types';
import { buildSpecialtyHtml } from './gen-med';

export function genSurgHtmlGenerator(data: FormatData): string {
  return buildSpecialtyHtml(data, {
    title: 'GENERAL SURGERY',
    showWaist: true,
    showSurgical: true,
    showDrawing: false,
  });
}
