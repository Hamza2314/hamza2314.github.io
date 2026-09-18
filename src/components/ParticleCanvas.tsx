import { useCallback, useMemo, useSyncExternalStore } from 'react'
import Particles, { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { Engine } from '@tsparticles/engine'
import { presetOptions } from '../lib/particlePresets'
import {
  getServerTuning,
  getTuning,
  subscribe as subscribeTuning,
} from '../lib/heroTuning'

/**
 * The only module that imports tsParticles, so Vite gives it its own chunk and
 * the hero paints without waiting on the engine.
 *
 * Preset and colour both come from the hero tuning store, which already is a
 * useSyncExternalStore with localStorage behind it. That is why the Phantom
 * site's separate particleStore has no counterpart here: there is one field on
 * this page, and the store it would need already exists.
 */

// Runs once: register the slim bundle of features and interactions.
const initEngine = async (engine: Engine): Promise<void> => {
  await loadSlim(engine)
}

export default function ParticleCanvas() {
  const tuning = useSyncExternalStore(subscribeTuning, getTuning, getServerTuning)

  // A new object here restarts the field, so it is built only when the preset
  // or the colour actually changes, not on every unrelated knob.
  const options = useMemo(
    () => presetOptions(tuning.particlePreset, tuning.dot),
    [tuning.particlePreset, tuning.dot],
  )

  const init = useCallback(initEngine, [])

  return (
    <ParticlesProvider init={init}>
      <Particles id="hero-particles" options={options} className="particles-canvas" />
    </ParticlesProvider>
  )
}
