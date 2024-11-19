import express from 'express';
import { alertAppointment } from '../controllers/alertController.js';

const router = express.Router();

router.post('/alert-appointment', alertAppointment);

export default router;