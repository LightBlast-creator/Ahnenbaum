/** Response shape for the /health endpoint. */
export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}
