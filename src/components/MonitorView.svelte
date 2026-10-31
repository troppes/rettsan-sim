<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Monitor } from '../lib/ecg/monitor';
  import { ECG } from '../lib/data';

  let { rhythm, rate, showEcg = true, showPleth = false, cpr = false, onbeat }: {
    rhythm: string | null; rate?: number; showEcg?: boolean; showPleth?: boolean; cpr?: boolean; onbeat?: () => void;
  } = $props();

  let canvas: HTMLCanvasElement;
  let mon: Monitor | null = null;
  const resize = () => mon?.resize();

  onMount(() => {
    mon = new Monitor(canvas, ECG);
    mon.onBeat = () => onbeat?.();
    mon.start();
    window.addEventListener('resize', resize);
  });
  onDestroy(() => { mon?.stop(); if (typeof window !== 'undefined') window.removeEventListener('resize', resize); });

  $effect(() => {
    if (!mon) return;
    mon.setRhythm(rhythm, rate);
    mon.showEcg = showEcg;
    mon.showPleth = showPleth;
    mon.cpr = cpr;
  });
</script>

<canvas bind:this={canvas}></canvas>
