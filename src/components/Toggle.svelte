<script lang="ts">
  let { checked = $bindable(), title, hint }: { checked: boolean; title: string; hint: string } = $props();
</script>

<label class="toggle">
  <input type="checkbox" bind:checked />
  <span class="track"><span class="thumb"></span></span>
  <span class="tlabel"><b>{title}</b><small>{hint}</small></span>
</label>
