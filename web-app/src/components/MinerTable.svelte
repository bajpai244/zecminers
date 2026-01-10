<script lang="ts">
  import type { MinerStats } from '../lib/types';

  interface Props {
    miners: MinerStats[];
    loading?: boolean;
  }

  let { miners, loading = false }: Props = $props();

  function truncateAddress(address: string): string {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  }

  function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
  <table class="w-full">
    <thead>
      <tr class="border-b border-gray-200 bg-gray-50">
        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-12">
          #
        </th>
        <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
          Miner Address
        </th>
        <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
          Blocks
        </th>
        <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 w-32">
          Share
        </th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#if loading}
        {#each Array(5) as _, i}
          <tr class="animate-pulse">
            <td class="px-4 py-3">
              <div class="h-4 bg-gray-200 rounded w-6"></div>
            </td>
            <td class="px-4 py-3">
              <div class="h-4 bg-gray-200 rounded w-48"></div>
            </td>
            <td class="px-4 py-3">
              <div class="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
            </td>
            <td class="px-4 py-3">
              <div class="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
            </td>
          </tr>
        {/each}
      {:else if miners.length === 0}
        <tr>
          <td colspan="4" class="px-4 py-8 text-center text-gray-500">
            No miners found for this period
          </td>
        </tr>
      {:else}
        {#each miners as miner, index}
          <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-3 text-sm text-gray-500 font-medium">
              {index + 1}
            </td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="font-mono text-sm text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                title="Click to copy: {miner.miner}"
                onclick={() => copyToClipboard(miner.miner)}
              >
                {truncateAddress(miner.miner)}
              </button>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900 text-right font-medium">
              {formatNumber(miner.blocks_mined)}
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <div class="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    class="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style="width: {Math.min(miner.percentage, 100)}%"
                  ></div>
                </div>
                <span class="text-sm text-gray-900 font-medium w-14 text-right">
                  {miner.percentage}%
                </span>
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
