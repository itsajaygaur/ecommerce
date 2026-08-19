import 'server-only'

/**
 * Build-time tolerance for database reads.
 *
 * The storefront chrome (header and footer) queries categories, so *every*
 * statically prerendered route touches the database during `next build`. That
 * made the build a hard dependency on database reachability: a preview
 * deployment without `DATABASE_URL`, or a momentary connection blip mid-deploy,
 * failed the whole build rather than one page.
 *
 * That is the wrong trade-off for these routes specifically, because they are all
 * ISR (`export const revalidate`). A build-time render is a provisional snapshot
 * that gets regenerated on revalidation or on the first `revalidatePath` from the
 * admin — so degrading to an empty snapshot costs at most one stale render, while
 * failing the build costs the entire deployment.
 *
 * The tolerance is deliberately scoped to the build. At request time a database
 * failure still throws and surfaces in `app/error.tsx`, because an empty catalog
 * served to a real shopper is a bug that must be visible, not swallowed.
 */

/** Next sets this while `next build` is prerendering (PHASE_PRODUCTION_BUILD). */
function isPrerendering(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

export async function tolerateDatabaseFailureAtBuild<T>(
  run: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await run()
  } catch (error) {
    if (!isPrerendering()) throw error

    console.warn(
      `[build] ${label} could not reach the database; prerendering an empty snapshot. ` +
        'The page will be regenerated on its first revalidation. ' +
        `Cause: ${error instanceof Error ? error.message : String(error)}`,
    )
    return fallback
  }
}
