/**
 * Feature barrel for the public contact form flow:
 * - `actions.ts`: typed Server Action for submissions.
 * - `hooks.ts`: client TanStack Query mutation boundary.
 * - `service.ts`: server-only validation and upstream relay.
 * - `lib.ts` (client-safe): payload/status types and localized status copy.
 *
 * The barrel stays empty so importing client helpers never pulls the Server
 * Action or server-only service into the browser bundle.
 */
export {};
