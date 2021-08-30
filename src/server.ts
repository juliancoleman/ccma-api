import { errors } from 'celebrate';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';

config();

import controllers from './controllers/mod';

const app = express();
const port: number = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: '*',
    optionsSuccessStatus: 200,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/', controllers);

app.use(errors());

app.listen(port, () => {
  console.info(`Server running on port ${port}`);
});
