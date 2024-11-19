import logger from '../config/logger.js';

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const alertAppointment = async (req, res) => {
  const { email, clinic, dateAppointment, doctorName } = req.body;

  try {
    // Send appointment confirmation 
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(dateAppointment).toLocaleDateString('es-ES', options);
    const formattedTime = new Date(dateAppointment).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formattedText = `Estimado/a paciente, le recordamos que tiene una cita médica el ${formattedDate} a las ${formattedTime} con el doctor ${doctorName} en la clínica ${clinic}.`;
  
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Cita médica agendada',
      text: formattedText,
    };
  
    await sgMail.send(msg);
    logger.info(`Email sent successfully to: ${email}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.headers && req.headers['x-forwarded-for'] || req.ip
    });

    // Schedule reminder
    try {
      const reminderDate = new Date(dateAppointment);
      reminderDate.setDate(reminderDate.getDate() - 1); // 24 hours before the appointment
      const formattedReminderTime = reminderDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const formattedText = `Estimado/a paciente, le recordamos que tiene una cita médica mañana a las ${formattedReminderTime} con el doctor ${doctorName} en la clínica ${clinic}.`;
  
      reminderDate.setDate(reminderDate.getDate() - 1); // 24 hours before the appointment
      const sendAtTimestamp = Math.floor(reminderDate.getTime() / 1000);
      
      const msg2 = {
        to: email,
        from: process.env.FROM_EMAIL,
        subject: 'Recordatorio de cita médica',
        text: formattedText,
        sendAt: sendAtTimestamp,
      };

      await sgMail.send(msg2);
      logger.info(`Reminder scheduled for ${email}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.headers && req.headers['x-forwarded-for'] || req.ip
      });
      res.status(200).json({ message: 'Email sent and scheduled successfully' });
    } catch (error) {
      logger.error('Error scheduling the reminder', {
        method: req.method,
        url: req.originalUrl,
        ip: req.headers && req.headers['x-forwarded-for'] || req.ip,
        error: error.message
      });
    }
  } catch (error) {
    logger.error('Error sending email', {
      method: req.method,
      url: req.originalUrl,
      ip: req.headers && req.headers['x-forwarded-for'] || req.ip,
      error: error.message
    });
    res.status(400).json({ message: error.message });
  }
};