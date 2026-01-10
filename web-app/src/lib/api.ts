import type { TimePeriod, MinerDistribution } from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchMinerDistribution(period: TimePeriod): Promise<MinerDistribution> {
  const response = await fetch(`${API_BASE}/api/miners/${period}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.statusText}`);
  }

  return response.json();
}
