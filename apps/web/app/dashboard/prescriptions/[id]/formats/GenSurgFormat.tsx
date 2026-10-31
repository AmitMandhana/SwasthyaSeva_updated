import React from 'react';
import type { FullPrescription } from '../../../../../lib/patientApi';
import { SpecialtyFormatBase } from './GenMedFormat';

export default function GenSurgFormat({ data }: { data: FullPrescription }) {
  return <SpecialtyFormatBase data={data} opts={{ showWaist: true, showSurgical: true, showDrawing: false }} />;
}
