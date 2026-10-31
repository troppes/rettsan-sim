<script lang="ts">
  let { title, groups, onpick, onclose }: {
    title: string;
    groups: { group: string; items: { id: string; label: string; time: number; done: boolean }[] }[];
    onpick: (id: string) => void;
    onclose: () => void;
  } = $props();
  const fmt = (t: number) => (t >= 60 ? `${Math.round(t / 60)} min` : `${t} s`);
</script>

<div class="sheet-bg open" role="presentation" onclick={onclose}></div>
<div class="sheet open">
  <div class="sheet-head"><span>{title}</span><button class="icon-btn" aria-label="Schließen" onclick={onclose}>✕</button></div>
  <div class="sheet-body">
    {#each groups as g (g.group)}
      <div class="grp">{g.group}</div>
      <div class="acts">
        {#each g.items as it (it.id)}
          <button class="act" class:done={it.done} onclick={() => onpick(it.id)}>{it.label}{#if it.time}<small>{fmt(it.time)}</small>{/if}</button>
        {/each}
      </div>
    {/each}
  </div>
</div>
