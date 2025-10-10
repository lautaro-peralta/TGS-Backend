import 'reflect-metadata';
import 'dotenv/config';

// IMPORTANT: set test env BEFORE importing the app/ORM
process.env.NODE_ENV = 'test';

// Dynamic import so the env is set first
const { app } = await import('../src/app.js');

// Expose the app globally for Supertest without opening a port
(globalThis as any).__APP__ = app;
