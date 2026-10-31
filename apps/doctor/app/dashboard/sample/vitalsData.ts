export interface VitalsReading {
  height: number;
  weight: number;
  bp_systolic: number;
  bp_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  timestamp: string;
}

export const sampleVitalsData: VitalsReading[] = [
  {
    height: 175,
    weight: 70,
    bp_systolic: 118,
    bp_diastolic: 78,
    heart_rate: 72,
    respiratory_rate: 16,
    oxygen_saturation: 98,
    timestamp: '2025-02-15T08:00:00Z',
  },
  {
    height: 175,
    weight: 69.5,
    bp_systolic: 120,
    bp_diastolic: 80,
    heart_rate: 75,
    respiratory_rate: 18,
    oxygen_saturation: 97,
    timestamp: '2025-03-20T08:00:00Z',
  },
  {
    height: 175,
    weight: 69,
    bp_systolic: 115,
    bp_diastolic: 75,
    heart_rate: 68,
    respiratory_rate: 15,
    oxygen_saturation: 99,
    timestamp: '2025-05-10T08:00:00Z',
  },
  {
    height: 175,
    weight: 70.2,
    bp_systolic: 122,
    bp_diastolic: 82,
    heart_rate: 78,
    respiratory_rate: 17,
    oxygen_saturation: 98,
    timestamp: '2025-06-25T08:00:00Z',
  },
  {
    height: 175,
    weight: 69.8,
    bp_systolic: 119,
    bp_diastolic: 79,
    heart_rate: 73,
    respiratory_rate: 16,
    oxygen_saturation: 97,
    timestamp: '2025-08-05T08:00:00Z',
  },
  {
    height: 175,
    weight: 70.5,
    bp_systolic: 121,
    bp_diastolic: 81,
    heart_rate: 76,
    respiratory_rate: 18,
    oxygen_saturation: 98,
    timestamp: '2025-09-12T08:00:00Z',
  },
  {
    height: 176,
    weight: 71,
    bp_systolic: 117,
    bp_diastolic: 77,
    heart_rate: 71,
    respiratory_rate: 16,
    oxygen_saturation: 98,
    timestamp: '2025-10-18T08:00:00Z',
  },
  {
    height: 176,
    weight: 70.8,
    bp_systolic: 123,
    bp_diastolic: 83,
    heart_rate: 79,
    respiratory_rate: 17,
    oxygen_saturation: 97,
    timestamp: '2025-11-22T08:00:00Z',
  },
  {
    height: 176,
    weight: 71.5,
    bp_systolic: 116,
    bp_diastolic: 76,
    heart_rate: 70,
    respiratory_rate: 15,
    oxygen_saturation: 99,
    timestamp: '2025-12-30T08:00:00Z',
  },
  {
    height: 176,
    weight: 71.2,
    bp_systolic: 120,
    bp_diastolic: 80,
    heart_rate: 74,
    respiratory_rate: 16,
    oxygen_saturation: 98,
    timestamp: '2026-01-06T08:00:00Z',
  },
];
