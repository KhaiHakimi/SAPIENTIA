/** The flag that lets the development seed run where NODE_ENV is production, for a deliberate one-off. */
export const FORCE_DEV_SEED_FLAG = '--force-dev';

/**
 * Why the development seed must not run here, or null when it may. Its accounts share one known password, so seeding a
 * production database by mistake would open it to anyone who has read the README.
 */
export function devSeedRefusal(env: NodeJS.ProcessEnv, args: readonly string[]): string | null {
  if (env.NODE_ENV !== 'production' || args.includes(FORCE_DEV_SEED_FLAG)) return null;
  return 'Refusing to seed: NODE_ENV is production, and the development seed creates accounts that share one known ' +
    `password. If this really is a development database, run it again with ${FORCE_DEV_SEED_FLAG}.`;
}
