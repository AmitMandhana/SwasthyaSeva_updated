import React from 'react';
import type { FullPrescription } from '../../../../../lib/patientApi';
import { SpecialtyFormatBase } from './GenMedFormat';

export default function EntFormat({ data }: { data: FullPrescription }) {
  return <SpecialtyFormatBase data={data} opts={{ showWaist: false, showSurgical: true, showDrawing: false }} />;
}
