<script lang="ts">
  import type { ViewType } from '../lib/types';

  interface Props {
    selected: ViewType;
    onSelect: (view: ViewType) => void;
  }

  let { selected, onSelect }: Props = $props();

  const views: { value: ViewType; label: string }[] = [
    { value: 'table', label: 'Table' },
    { value: 'chart', label: 'Chart' },
  ];
</script>

<div class="flex justify-center">
  <div class="inline-flex bg-gray-100 rounded-lg p-1">
    {#each views as view}
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 {selected === view.value
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-600 hover:text-gray-900'}"
        onclick={() => onSelect(view.value)}
      >
        {view.label}
      </button>
    {/each}
  </div>
</div>
