declare namespace Cloudflare {
  interface Env {
    COINGECKO_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
