import { Router } from 'express';

import registrants from './registrants/mod';
import registrations from './registrations/mod';
import payments from './payments/mod';
import events from './events/mod';

import { resourceNotExists } from '../helpers/middleware/resourceNotExists';

const router = Router();

router.use('/registrants', registrants);
router.use('/registrations', registrations);
router.use('/payments', payments);
router.use('/events', events);
router.use('*', resourceNotExists);

export default router;
