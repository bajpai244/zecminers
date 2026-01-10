<script lang="ts">
  import type { MinerStats } from '../lib/types';

  interface Props {
    miners: MinerStats[];
    loading?: boolean;
  }

  let { miners, loading = false }: Props = $props();

  // Color palette for pie slices
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#6366F1', // indigo
  ];

  const othersColor = '#9CA3AF'; // gray

  // Process miners: group small ones into "Others"
  function processMiners(miners: MinerStats[]): { label: string; percentage: number; color: string; fullAddress?: string }[] {
    const threshold = 2; // Group miners with < 2% into "Others"
    const processed: { label: string; percentage: number; color: string; fullAddress?: string }[] = [];
    let othersPercentage = 0;

    miners.forEach((miner, index) => {
      if (miner.percentage >= threshold && processed.length < colors.length) {
        processed.push({
          label: truncateAddress(miner.miner),
          fullAddress: miner.miner,
          percentage: miner.percentage,
          color: colors[processed.length] || othersColor,
        });
      } else {
        othersPercentage += miner.percentage;
      }
    });

    if (othersPercentage > 0) {
      processed.push({
        label: 'Others',
        percentage: Math.round(othersPercentage * 100) / 100,
        color: othersColor,
      });
    }

    return processed;
  }

  function truncateAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Calculate pie chart segments
  function calculateSegments(data: { percentage: number; color: string }[]): { path: string; color: string }[] {
    const segments: { path: string; color: string }[] = [];
    let currentAngle = -90; // Start from top

    data.forEach((item) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      const path = describeArc(100, 100, 80, startAngle, endAngle);
      segments.push({ path, color: item.color });

      currentAngle = endAngle;
    });

    return segments;
  }

  function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      'M', x, y,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  }

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  let processedData = $derived(processMiners(miners));
  let segments = $derived(calculateSegments(processedData));
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  {#if loading}
    <div class="flex flex-col md:flex-row items-center justify-center gap-8 animate-pulse">
      <div class="w-48 h-48 bg-gray-200 rounded-full"></div>
      <div class="space-y-3 w-full max-w-xs">
        {#each Array(5) as _}
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 bg-gray-200 rounded"></div>
            <div class="h-4 bg-gray-200 rounded flex-1"></div>
          </div>
        {/each}
      </div>
    </div>
  {:else if miners.length === 0}
    <div class="text-center py-8 text-gray-500">
      No miners found for this period
    </div>
  {:else}
    <div class="flex flex-col md:flex-row items-center justify-center gap-8">
      <!-- Pie Chart -->
      <svg viewBox="0 0 200 200" class="w-48 h-48 md:w-56 md:h-56">
        {#each segments as segment}
          <path
            d={segment.path}
            fill={segment.color}
            class="transition-opacity hover:opacity-80"
          />
        {/each}
        <!-- Center circle for donut effect -->
        <circle cx="100" cy="100" r="40" fill="white" />
      </svg>

      <!-- Legend -->
      <div class="space-y-2 w-full max-w-sm">
        {#each processedData as item}
          <div class="flex items-center gap-3 group">
            <div
              class="w-4 h-4 rounded flex-shrink-0"
              style="background-color: {item.color}"
            ></div>
            <span
              class="text-sm text-gray-700 font-mono truncate flex-1"
              title={item.fullAddress || item.label}
            >
              {item.label}
            </span>
            <span class="text-sm font-medium text-gray-900 flex-shrink-0">
              {item.percentage}%
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
