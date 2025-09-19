import 'reflect-metadata';
import 'dotenv/config';
import { app, initDev } from './app.js';
import { env } from './config/env.js';

if (process.env.NODE_ENV === 'development') {
  await initDev();
}

app.listen(env.PORT, () => {
  console.log();
  console.log(
    `Servidor corriendo en http://localhost:${env.PORT}/ [${process.env.NODE_ENV}]`
  );
});
