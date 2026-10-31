import { mount } from 'svelte';
import App from './App.svelte';
import { procMemory } from './lib/engine/memory';
import './app.css';

// Maßnahmen-Gedächtnis im Browser behalten (fehlt der Speicher, geht es ohne)
const KEY = 'rettsan-proc-memory';
try { procMemory.data = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* ohne Speicher */ }
procMemory.onSave = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ohne Speicher */ } };

mount(App, { target: document.getElementById('app')! });
