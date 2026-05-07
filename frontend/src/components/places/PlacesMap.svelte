<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { places } from '../../stores/collections';
  import { escapeHtml } from '../../utils';

  let mapEl: HTMLDivElement;
  let map: L.Map | null = null;
  let markers: L.Marker[] = [];

  onMount(() => {
    map = L.map(mapEl, { worldCopyJump: true }).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    renderMarkers();
  });

  // Re-render markers whenever the places store changes.
  $: if (map) { void $places; renderMarkers(); }

  function renderMarkers() {
    if (!map) return;
    markers.forEach((m) => map!.removeLayer(m));
    markers = [];
    for (const p of $places) {
      const marker = L.marker([p.lat, p.lng]);
      const note = p.note ? `<br><em>${escapeHtml(p.note)}</em>` : '';
      marker.bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>Age ${p.year}${note}`);
      marker.addTo(map);
      markers.push(marker);
    }
    if ($places.length > 0) {
      try {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 6 });
      } catch (e) { /* single-point bounds can throw */ }
    }
  }

  // Allow other components to fly to a place.
  function handleFly(e: Event) {
    const ev = e as CustomEvent<{ lat: number; lng: number }>;
    if (!map || !ev.detail) return;
    map.flyTo([ev.detail.lat, ev.detail.lng], 8, { duration: 0.8 });
  }
  onMount(() => window.addEventListener('places:fly', handleFly));
  onDestroy(() => {
    window.removeEventListener('places:fly', handleFly);
    if (map) { map.remove(); map = null; }
  });
</script>

<div class="map" bind:this={mapEl}></div>

<style>
  .map {
    width: 100%;
    height: 360px;
    border-radius: 14px;
    border: 1px solid var(--border);
    margin-bottom: 14px;
    z-index: 0;
  }
  /* Override Leaflet's default font; everything else from leaflet.css. */
  :global(.leaflet-container) { font-family: inherit; }
</style>
