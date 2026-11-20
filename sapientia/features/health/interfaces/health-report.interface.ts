/** Body of GET /health. No error detail goes out: a public probe must not reveal hosts, versions or messages. */
export interface HealthReport {
  status: 'ok' | 'unavailable';
  checks: { database: 'up' | 'down' };
}
