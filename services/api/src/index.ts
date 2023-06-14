import express from 'express';

import { logging } from '@chafouin/common';
import * as routes from './routes/index.js';

const logger = logging('server');

const app = express();
app.use(routes.search);
app.use(routes.subscribe);
app.use(routes.unsubscribe);

app.listen(8080, () => {
  logger.info('Running on port 8080');
});