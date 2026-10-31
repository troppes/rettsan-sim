<script lang="ts">
  import { app } from '../lib/app.svelte';
</script>

<div class="toasts">
  {#each app.toasts as t (t.id)}<div class="toast {t.tone}">{t.text}</div>{/each}
</div>
