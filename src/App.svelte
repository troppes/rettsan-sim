<script lang="ts">
  import { app } from './lib/app.svelte';
  import { account } from './lib/account/account.svelte';
  import Toasts from './components/Toasts.svelte';
  import Home from './screens/Home.svelte';
  import GameScreen from './screens/GameScreen.svelte';
  import TrainerBasic from './screens/TrainerBasic.svelte';
  import TrainerPro from './screens/TrainerPro.svelte';
  import Login from './screens/Login.svelte';
  import Progress from './screens/Progress.svelte';

  account.init();
</script>

{#key app.screen}
  {#if app.screen.name === 'home'}<Home />
  {:else if app.screen.name === 'game'}<GameScreen caseId={app.screen.caseId} dispatch={app.screen.dispatch} />
  {:else if app.screen.name === 'trainer'}<TrainerBasic />
  {:else if app.screen.name === 'trainerPro'}<TrainerPro rhythms={app.screen.rhythms} />
  {:else if app.screen.name === 'login'}<Login />
  {:else if app.screen.name === 'progress'}<Progress />
  {/if}
{/key}
<Toasts />
