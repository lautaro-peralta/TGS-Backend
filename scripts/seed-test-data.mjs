/**
 * ============================================================================
 * THE GARRISON SYSTEM - Seed Test Data Script
 * ============================================================================
 *
 * Este script carga datos de prueba en la base de datos para evaluación.
 *
 * USO:
 *   node scripts/seed-test-data.mjs
 *
 * REQUISITOS:
 *   - Base de datos MySQL corriendo (docker-compose up -d)
 *   - Tablas creadas (levantar el backend una vez en modo dev)
 *
 * ============================================================================
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de la base de datos
const DB_CONFIG = {
  host: 'localhost',
  port: 3307,
  user: 'dsw',
  password: 'dsw',
  database: 'tpdesarrollo',
  multipleStatements: true
};

async function loadTestData() {
  let connection;

  try {
    console.log('\n🔄 Conectando a MySQL...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Conectado a MySQL\n');

    // Leer el archivo SQL
    const sqlFilePath = join(__dirname, '../../../infra/init-test-data.sql');
    console.log(`📄 Leyendo archivo: ${sqlFilePath}`);
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    // Ejecutar el script SQL
    console.log('🚀 Cargando datos de prueba...\n');
    await connection.query(sqlContent);

    console.log('✅ Datos de prueba cargados exitosamente!\n');

    // Mostrar resumen
    const [zones] = await connection.query('SELECT COUNT(*) as count FROM zones');
    const [products] = await connection.query('SELECT COUNT(*) as count FROM products');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [sales] = await connection.query('SELECT COUNT(*) as count FROM sales');

    console.log('📊 Resumen de datos cargados:');
    console.log(`   - Zonas: ${zones[0].count}`);
    console.log(`   - Productos: ${products[0].count}`);
    console.log(`   - Usuarios: ${users[0].count}`);
    console.log(`   - Ventas: ${sales[0].count}`);
    console.log('\n✅ Script completado exitosamente!');
    console.log('\n📝 Usuarios de prueba (password: "password123"):');
    console.log('   - thomas.shelby (ADMIN)');
    console.log('   - arthur.shelby, polly.gray (PARTNERS)');
    console.log('   - john.shelby, michael.gray, isaiah.jesus (DISTRIBUTORS)');
    console.log('   - alfie.solomons, johnny.dogs, aberama.gold (CLIENTS)');
    console.log('   - insp.campbell, moss.officer (AUTHORITIES)\n');

  } catch (error) {
    console.error('\n❌ Error al cargar datos de prueba:');

    if (error.code === 'ECONNREFUSED') {
      console.error('   ⚠️  No se pudo conectar a MySQL.');
      console.error('   ℹ️  Asegurate de que Docker esté corriendo:');
      console.error('       cd infra && docker-compose up -d\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   ⚠️  La base de datos no existe.');
      console.error('   ℹ️  Verifica que el backend haya creado la BD.\n');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.error('   ⚠️  Las tablas no existen.');
      console.error('   ℹ️  Primero levanta el backend en modo development:');
      console.error('       cd apps/backend && pnpm start:dev\n');
      console.error('   Espera a que el backend cree las tablas, luego ejecuta este script.\n');
    } else if (error.code === 'ER_DUP_ENTRY') {
      console.error('   ⚠️  Los datos ya existen en la base de datos.');
      console.error('   ℹ️  Si querés recargar, primero borra los datos o recrea la BD:\n');
      console.error('       cd infra');
      console.error('       docker-compose down -v');
      console.error('       docker-compose up -d');
      console.error('       cd ../apps/backend');
      console.error('       pnpm start:dev (espera que cree tablas)');
      console.error('       node scripts/seed-test-data.mjs\n');
    } else {
      console.error('   ', error.message);
      console.error('\nStack trace:', error.stack);
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar el script
loadTestData();
