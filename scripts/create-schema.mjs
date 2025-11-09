import { MikroORM } from '@mikro-orm/core';
import config from '../dist/shared/db/orm.config.js';

async function createSchema() {
  console.log('Connecting to database...');
  const orm = await MikroORM.init(config);

  console.log('Creating database schema...');
  const generator = orm.getSchemaGenerator();

  // Drop all tables and recreate (use with caution!)
  await generator.dropSchema();
  await generator.createSchema();

  console.log('Schema created successfully!');

  await orm.close(true);
}

createSchema()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error creating schema:', error);
    process.exit(1);
  });
