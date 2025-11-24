import { MikroORM } from '@mikro-orm/core';
import config from '../dist/shared/db/orm.config.js';

async function updateSchema() {
  console.log('🔌 Connecting to database...');
  const orm = await MikroORM.init(config);

  console.log('📊 Updating database schema (safe mode - no data loss)...');
  const generator = orm.getSchemaGenerator();

  try {
    // Get SQL statements that will be executed (for logging)
    const updateSQL = await generator.getUpdateSchemaSQL();

    if (updateSQL.trim() === '') {
      console.log('✅ Schema is already up to date! No changes needed.');
    } else {
      console.log('📝 SQL statements to be executed:');
      console.log(updateSQL);
      console.log('\n🔄 Executing schema update...');

      // Update schema without dropping tables (SAFE)
      await generator.updateSchema();

      console.log('✅ Schema updated successfully!');
    }
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    throw error;
  } finally {
    await orm.close(true);
  }
}

updateSchema()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
