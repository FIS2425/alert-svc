import { describe, expect, it, vi, beforeEach } from 'vitest';
import { request } from '@tests/setup/setup';
import sgMail from '@sendgrid/mail';

vi.mock('@sendgrid/mail');

describe('AlertController', () => {
  beforeEach(() => {
    // Mockear la función setApiKey de SendGrid
    sgMail.setApiKey = vi.fn();
    // Limpiar todos los mocks antes de cada prueba
    vi.clearAllMocks();
  });

  describe('POST /alert/alert-appointment', () => {
    it('should return 503 when sendgrid can not be accessed', async () => {
      sgMail.send.mockResolvedValueOnce({}); // Mock para el correo de confirmación
      sgMail.send.mockResolvedValueOnce({}); // Mock para el correo de recordatorio

      const response = await request.post('/alert/alert-appointment').send({
        email: 'test@example.com',
        clinic: 'Test Clinic',
        dateAppointment: new Date().toISOString(),
        doctorName: 'Dr. Test'
      });

      expect(response.status).toBe(503);
      expect(response.body.message).toBe('Email service temporarily unavailable. Please try again later.');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request.post('/alert/alert-appointment').send({
        email: 'test@example.com',
        clinic: 'Test Clinic',
        // Falta el campo dateAppointment
        doctorName: 'Dr. Test'
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing required fields');
    });
  });
});