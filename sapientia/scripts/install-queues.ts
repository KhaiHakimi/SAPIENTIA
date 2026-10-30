/**
 * Installs pg-boss's own schema and Sapientia's queues; safe to run again. `npm run db:migrate` calls it after the SQL
 * migrations. An argument names a different connection variable, for example TEST_DATABASE_URL.
 */
async function main(): Promise<void> {
  const variable = process.argv[2] ?? 'DATABASE_URL';
  if (variable !== 'DATABASE_URL') process.env.DATABASE_URL = process.env[variable];
  // Imported after the variable is in place: the database module reads it when first used.
  const { installQueues } = await import('@/features/delivery/server/delivery-queue.service');
  await installQueues();
  console.log('Queues installed.');
}

main().catch((error: unknown) => {
  console.error('Installing queues failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
