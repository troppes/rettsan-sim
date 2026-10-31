<script lang="ts">
  /* Minispiele üben: einzelne Maßnahmen ohne Einsatz, beliebig oft wiederholen */
  import { app } from '../lib/app.svelte';
  import { Game } from '../lib/engine/game';
  import type { CaseDef, Look, ProcMode } from '../lib/types';
  import { pick } from '../lib/util';
  import TopBar from '../components/TopBar.svelte';
  import PromptModal from '../components/PromptModal.svelte';
  import PatientFace from '../components/PatientFace.svelte';

  type Drill = { id: string; mode: ProcMode; icon: string; label: string; sub: string };
  const DRILLS: Drill[] = [
    { id: 'c_rr', mode: 'gauge', icon: '🩸', label: 'Blutdruck von Hand', sub: 'Aufpumpen, langsam ablassen, Korotkow-Töne hören' },
    { id: 'c_ekg', mode: 'place', icon: '📈', label: 'EKG 3-/4-Pol kleben', sub: 'Monitor-Elektroden an die richtige Stelle' },
    { id: 'c_12', mode: 'place', icon: '🫀', label: '12-Kanal: Brustwand V1–V6', sub: 'Interkostalräume und Linien finden' },
    { id: 'm_defi_kleben', mode: 'place', icon: '⚡', label: 'Defi-Pads kleben', sub: 'Sternal und apikal' },
    { id: 'm_ivz', mode: 'iv', icon: '💉', label: 'i.v.-Zugang legen', sub: 'Stauen, Vene wählen, desinfizieren, punktieren' },
  ];
  const LOOKS: Look[] = [
    { sex: 'm', age: 'mid', skin: '#f1c7a5', hair: '#5a3b22', hairStyle: 'short' },
    { sex: 'f', age: 'young', skin: '#e0ac85', hair: '#2b1d14', hairStyle: 'long' },
    { sex: 'f', age: 'old', skin: '#f3d2bb', hair: '#d8d8d8', hairStyle: 'bun' },
    { sex: 'm', age: 'old', skin: '#c68e63', hair: '#9a9a9a', hairStyle: 'bald' },
  ];

  let game = $state<Game | null>(null);
  let drill = $state<Drill | null>(null);
  let version = $state(0);
  let finished = $state(false);
  let rounds = $state(0);
  let points = $state(0);
  let maxPoints = $state(0);
  const look = $state<Look>(pick(LOOKS));

  function practiceCase(): CaseDef {
    const sys = 95 + Math.round(Math.random() * 75);
    const dia = Math.max(50, Math.min(sys - 25, 55 + Math.round(Math.random() * 45)));
    return {
      id: 'uebung', level: 1, person: '🧑', icon: '🎯', look, name: 'Übungspatient', mood: 8, noStress: true,
      dispatches: [{ short: 'Übung', text: 'Übung an der Puppe.' }],
      start: { hr: 60 + Math.round(Math.random() * 40), rhythm: 'sinus', spo2: 97, sys, dia, af: 14, bz: 100, temp: 36.8, gcs: 15, status: 'Liegt entspannt auf der Liege.' },
      diagnosis: { options: ['Übung'], answer: 0 }, teach: [],
    };
  }
  function start(d: Drill) {
    drill = d; finished = false;
    const g = new Game(practiceCase(), { worsen: false, detail: true });
    g.onChange = () => version++;
    game = g;
    g.practice(d.id, d.mode, () => {
      const ev = g.s.events.filter((e) => e.max > 0);
      points += ev.reduce((t, e) => t + e.pts, 0);
      maxPoints += ev.reduce((t, e) => t + e.max, 0);
      rounds++;
      finished = true;
      version++;
    });
  }
  const view = $derived.by(() => {
    void version;
    return { prompt: game?.prompt ? structuredClone($state.snapshot(game.prompt)) : null, face: game ? game.face() : { mood: 8, eyes: 'open' as const, pale: false, sweat: false, flushed: false, cyanotic: false } };
  });
</script>

<section class="screen active">
  <TopBar title="Minispiele üben" sub={rounds ? `${rounds} Runden · ${points} / ${maxPoints} Punkte` : 'Ohne Einsatz, so oft du willst'} onBack={() => (drill ? (drill = null, game = null) : app.home())} />
  {#if !drill}
    {#each DRILLS as d (d.id)}
      <button class="case-btn drill" onclick={() => start(d)}>
        <span class="ic">{d.icon}</span>
        <span class="txt"><b>{d.label}</b><span class="muted">{d.sub}</span></span>
      </button>
    {/each}
    <button class="case-btn drill" onclick={() => app.go({ name: 'radio' })}>
      <span class="ic">📻</span>
      <span class="txt"><b>Funk und Status</b><span class="muted">FMS-Status drücken, Funksprüche bauen, Funkregeln</span></span>
    </button>
  {:else}
    <div class="card practice-pt">
      <PatientFace {look} face={view.face} size={56} />
      <div><b>{drill.icon} {drill.label}</b><div class="muted">{drill.sub}</div></div>
    </div>
    {#if finished}
      <div class="card">
        <p>Fertig. Nochmal mit neuem Patienten?</p>
        <button class="btn wide accent" onclick={() => start(drill!)}>🔁 Nochmal</button>
        <button class="btn wide ghost" onclick={() => { drill = null; game = null; }}>Andere Übung</button>
      </div>
    {/if}
    {#if game && view.prompt}
      <PromptModal {game} prompt={view.prompt} />
      <button class="practice-close" aria-label="Übung abbrechen" onclick={() => { drill = null; game = null; }}>✕</button>
    {/if}
  {/if}
</section>

<style>
  .drill { display: flex; gap: 12px; align-items: center; text-align: left; width: 100%; }
  .drill .ic { font-size: 28px; }
  .drill .txt { display: flex; flex-direction: column; gap: 2px; }
  .practice-pt { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
  .practice-close { position: fixed; top: calc(env(safe-area-inset-top) + 8px); right: 12px; z-index: 41; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--bg2); color: inherit; font-size: 18px; }
</style>
