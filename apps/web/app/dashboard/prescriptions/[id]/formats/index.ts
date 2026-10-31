import type { ComponentType } from 'react';
import type { FullPrescription } from '../../../../../lib/patientApi';
import GenMedFormat from './GenMedFormat';
import GenSurgFormat from './GenSurgFormat';
import EntFormat from './EntFormat';

export type FormatProps = { data: FullPrescription };

const FORMAT_COMPONENTS: Record<string, ComponentType<FormatProps>> = {
  GEN_MED: GenMedFormat,
  GEN_SURG: GenSurgFormat,
  ENT: EntFormat,
};

export function getFormatComponent(format: string): ComponentType<FormatProps> {
  return FORMAT_COMPONENTS[format] || FORMAT_COMPONENTS.GEN_MED;
}
