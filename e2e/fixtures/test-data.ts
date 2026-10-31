const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

interface CreateAppointmentParams {
  doctor_id: number;
  user_id: number;
  slot_id: number;
  appointment_date: string;
  symptom_code: string;
  symptom_text: string;
  complaints?: string;
}

export async function createTestAppointment(params: CreateAppointmentParams): Promise<number> {
  const res = await fetch(`${BACKEND_URL}/api/test/create-appointment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create test appointment: ${res.status} ${body}`);
  }
  const data = await res.json();
  return data.appointment_id;
}

export async function deleteTestAppointment(appointmentId: number): Promise<void> {
  await fetch(`${BACKEND_URL}/api/test/appointment/${appointmentId}`, { method: 'DELETE' });
}
