<script lang="ts">
  import { drawPaper } from '../lib/ecg/paper';
  import type { Signal } from '../lib/ecg/signal';

  let { signal }: { signal: Signal } = $props();
  let wrap: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  const draw = () => {
    canvas.style.width = Math.max(wrap.clientWidth, signal.dur * 120) + 'px';
    drawPaper(canvas, signal);
  };
  $effect(() => {
    signal;
    requestAnimationFrame(() => { draw(); wrap.scrollLeft = 0; });
  });
</script>

<svelte:window onresize={draw} />
<div class="t2wrap" bind:this={wrap}><canvas bind:this={canvas}></canvas></div>
