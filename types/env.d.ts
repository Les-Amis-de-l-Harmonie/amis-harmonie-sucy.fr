declare namespace Cloudflare {
  interface Env {
    /** Secret Worker (wrangler secret put) protégeant /api/reservations/stats. */
    RESERVATIONS_STATS_TOKEN?: string;
  }
}
