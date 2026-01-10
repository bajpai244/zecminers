<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/Header.svelte';
  import PeriodToggle from './components/PeriodToggle.svelte';
  import ViewToggle from './components/ViewToggle.svelte';
  import StatsBar from './components/StatsBar.svelte';
  import MinerTable from './components/MinerTable.svelte';
  import MinerPieChart from './components/MinerPieChart.svelte';
  import { fetchMinerDistribution } from './lib/api';
  import type { TimePeriod, ViewType, MinerDistribution } from './lib/types';

  let selectedPeriod: TimePeriod = $state('24h');
  let selectedView: ViewType = $state('table');
  let data: MinerDistribution | null = $state(null);
  let loading: boolean = $state(true);
  let error: string | null = $state(null);

  async function loadData(period: TimePeriod) {
    loading = true;
    error = null;

    try {
      data = await fetchMinerDistribution(period);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      data = null;
    } finally {
      loading = false;
    }
  }

  function handlePeriodChange(period: TimePeriod) {
    selectedPeriod = period;
    loadData(period);
  }

  function handleViewChange(view: ViewType) {
    selectedView = view;
  }

  onMount(() => {
    loadData(selectedPeriod);
  });
</script>

<div class="min-h-screen bg-gray-50">
  <Header />

  <main class="max-w-4xl mx-auto px-4 py-8">
    <div class="space-y-6">
      <!-- Toggles Row -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <PeriodToggle
          selected={selectedPeriod}
          onSelect={handlePeriodChange}
          disabled={loading}
        />
        <ViewToggle
          selected={selectedView}
          onSelect={handleViewChange}
        />
      </div>

      <!-- Error State -->
      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p class="text-red-600 text-sm">{error}</p>
          <button
            type="button"
            class="mt-2 text-sm text-red-700 underline hover:no-underline"
            onclick={() => loadData(selectedPeriod)}
          >
            Try again
          </button>
        </div>
      {/if}

      <!-- Stats Bar -->
      {#if data && !error}
        <StatsBar
          totalBlocks={data.total_blocks}
          startTime={data.start_time}
          endTime={data.end_time}
        />
      {:else if loading}
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
          <div class="flex justify-between">
            <div class="h-4 bg-gray-200 rounded w-32"></div>
            <div class="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      {/if}

      <!-- Data View (Table or Chart) -->
      {#if selectedView === 'table'}
        <MinerTable
          miners={data?.miners ?? []}
          loading={loading}
        />
      {:else}
        <MinerPieChart
          miners={data?.miners ?? []}
          loading={loading}
        />
      {/if}
    </div>
  </main>

  <!-- Footer -->
  <footer class="max-w-4xl mx-auto px-4 py-8 text-center">
    <p class="text-sm text-gray-400">
      Data sourced from Zcash blockchain
    </p>
  </footer>
</div>
