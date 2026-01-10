<script lang="ts">
  import type { TimePeriod } from '../lib/types';

  interface Props {
    selected: TimePeriod;
    onSelect: (period: TimePeriod) => void;
    disabled?: boolean;
  }

  let { selected, onSelect, disabled = false }: Props = $props();

  const periods: { value: TimePeriod; label: string }[] = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '1m', label: '1m' },
    { value: '1y', label: '1y' },
  ];
</script>

<div class="flex justify-center">
  <div class="inline-flex bg-gray-100 rounded-lg p-1">
    {#each periods as period}
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {selected === period.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'}"
        class:opacity-50={disabled}
        class:cursor-not-allowed={disabled}
        disabled={disabled}
        onclick={() => onSelect(period.value)}
      >
        {period.label}
      </button>
    {/each}
  </div>
</div>
