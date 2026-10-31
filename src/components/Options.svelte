<script lang="ts">
  import type { Choice } from '../lib/engine/state';
  let { choices, disabled = false, onpick }: { choices: Choice[]; disabled?: boolean; onpick: (i: number) => void } = $props();
</script>

<div class="options">
  {#each choices as c, i (i)}
    <button class="opt {c.state === 'right' ? 'right' : c.state === 'wrong' ? 'wrong' : ''}" disabled={disabled || !!c.state} onclick={() => onpick(i)}>{c.label}</button>
  {/each}
</div>
