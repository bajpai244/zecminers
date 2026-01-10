<script lang="ts">
  interface Props {
    totalBlocks: number;
    startTime: string;
    endTime: string;
  }

  let { totalBlocks, startTime, endTime }: Props = $props();

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <div class="flex items-center gap-2">
      <span class="text-gray-500 text-sm">Total Blocks:</span>
      <span class="font-semibold text-gray-900">{formatNumber(totalBlocks)}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-gray-500 text-sm">Period:</span>
      <span class="font-medium text-gray-700">
        {formatDate(startTime)} – {formatDate(endTime)}
      </span>
    </div>
  </div>
</div>
