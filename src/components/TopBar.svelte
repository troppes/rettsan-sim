<script lang="ts">
  import type { Snippet } from 'svelte';
  let { title, sub, onBack, backLabel = 'Zurück', backIcon = '←', right }: {
    title: string; sub?: string; onBack?: () => void; backLabel?: string; backIcon?: string; right?: Snippet;
  } = $props();
</script>

<div class="topbar">
  {#if onBack}<button class="icon-btn" aria-label={backLabel} onclick={onBack}>{backIcon}</button>{/if}
  <div class="tb-mid">
    <div class="tb-title">{title}</div>
    {#if sub}<div class="tb-sub">{sub}</div>{/if}
  </div>
  {#if right}{@render right()}{/if}
</div>
