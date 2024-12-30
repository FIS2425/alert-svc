import logger from '../config/logger.js';
import sgMail from '@sendgrid/mail';
import CircuitBreaker from 'opossum';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Función para enviar emails usando SendGrid
const sendEmail = async (msg, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      if (attempt === retries) {
        throw error; // Propagar el error después del último intento
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar antes del siguiente intento
    }
  }
};


const circuitBreakerEmailOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const emailBreaker = new CircuitBreaker(sendEmail, circuitBreakerEmailOptions);

emailBreaker.on('open', () => {
  logger.warn('Circuit breaker opened for SendGrid service');
});
emailBreaker.on('halfOpen', () => {
  logger.info('Circuit breaker is half-open for SendGrid service');
});
emailBreaker.on('close', () => {
  logger.info('Circuit breaker closed for SendGrid service');
});

// Fallback del Circuit Breaker
emailBreaker.fallback(() => {
  logger.error('Circuit Breaker Fallback activated for SendGrid');
  return { fallback: true, message: 'Email service temporarily unavailable. Please try again later.' };
});

export const alertAppointment = async (req, res) => {
  const { email, clinic, dateAppointment, doctorName } = req.body;

  // Verificar campos requeridos
  if (!email || !clinic || !dateAppointment || !doctorName) {
    logger.warn('Missing required fields', { email, clinic, dateAppointment, doctorName });
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Send appointment confirmation 
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = new Date(dateAppointment).toLocaleDateString('es-ES', options);
    const appointmentDate = new Date(dateAppointment);
    appointmentDate.setHours(appointmentDate.getHours() - 1);
    const formattedTime = appointmentDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formattedText = `Estimado/a paciente, le recordamos que tiene una cita médica el ${formattedDate} a las ${formattedTime} con el doctor ${doctorName} en la clínica ${clinic}.`;
  
    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: 'Cita médica agendada',
      text: formattedText,
    };
  
    console.log('msg', msg);
    try {
      const result = await emailBreaker.fire(msg);
      console.log('result', result);
      if (result.fallback) {
        return res.status(503).send(result);
      }

      logger.info(`Email sent successfully to: ${email}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.headers && req.headers['x-forwarded-for'] || req.ip
      });

      // Schedule reminder
      try {
        const reminderDate = new Date(dateAppointment);
        reminderDate.setDate(reminderDate.getDate() - 1); // 24 hours before the appointment
        reminderDate.setHours(reminderDate.getHours() - 1);
        const formattedReminderText = `Estimado/a paciente, le recordamos que tiene una cita médica mañana a las ${formattedTime} con el doctor ${doctorName} en la clínica ${clinic}.`;
    
        const sendAtTimestamp = Math.floor(reminderDate.getTime() / 1000);
        console.log('sendAtTimestamp', sendAtTimestamp);
        
        const reminderMsg = {
          to: email,
          from: process.env.FROM_EMAIL,
          subject: 'Recordatorio de cita médica',
          text: formattedReminderText,
          sendAt: sendAtTimestamp
        };
    
        const reminderResult = await emailBreaker.fire(reminderMsg);
        if (reminderResult.fallback) {
          return res.status(503).send(reminderResult);
        }

        logger.info(`Reminder scheduled for ${email}`, {
          method: req.method,
          url: req.originalUrl,
          ip: req.headers && req.headers['x-forwarded-for'] || req.ip
        });

        res.status(200).json({ message: 'Email sent and scheduled successfully' });
      } catch (error) {
        logger.error(`Error scheduling reminder for: ${email}`, {
          error: error.message,
        });
        res.status(500).json({ message: 'Failed to schedule reminder' });
      }
    } catch (error) {
      logger.error(`Error sending email to: ${email}`, {
        error: error.message,
      });
      res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (error) {
    logger.error(`Error sending email to: ${email}`, {
      error: error.message,
    });
    res.status(500).json({ message: 'Failed to send email' });
  }
};