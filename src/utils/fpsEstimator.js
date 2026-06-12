/**
 * PC Architect — FPS Estimator
 * Rough 1080p FPS predictions for popular games, derived from the
 * performance class of the selected GPU and CPU. Pure game balance
 * numbers, not real benchmarks — Walter's lawyers insisted we say that.
 */

const GAMES = [
  { id: 'cs2', name: 'Counter-Strike 2', base: [90, 200, 300, 400], igpu: 45 },
  { id: 'fortnite', name: 'Fortnite', base: [60, 120, 200, 280], igpu: 30 },
  { id: 'gtav', name: 'GTA V', base: [55, 95, 140, 180], igpu: 28 },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', base: [28, 55, 95, 140], igpu: 12 },
  { id: 'minecraft', name: 'Minecraft', base: [130, 220, 320, 420], igpu: 70, cpuBound: true },
];

const PERF = { low: 1, mid: 2, high: 3, ultra: 4 };

// How much a weak CPU drags down GPU-bound games (and vice versa)
const PAIR_FACTOR = { 1: 0.7, 2: 0.85, 3: 1.0, 4: 1.05 };

/**
 * Estimate FPS for each game based on the selected CPU and GPU.
 * Returns null when the build has no display output at all.
 * iGPU-only builds get the (humble) integrated graphics numbers.
 */
export function estimateFps(cpu, gpu) {
  const hasIgpuOnly = !gpu && cpu && cpu.hasIGPU === true;
  if (!gpu && !hasIgpuOnly) return null;

  const cpuTier = cpu ? PERF[cpu.performanceClass] || 1 : 1;

  return GAMES.map((game) => {
    let fps;
    if (hasIgpuOnly) {
      fps = game.igpu * (PAIR_FACTOR[cpuTier] || 1);
    } else {
      const gpuTier = PERF[gpu.performanceClass] || 1;
      // CPU-bound games care about the CPU tier first, GPU second
      const primary = game.cpuBound ? cpuTier : gpuTier;
      const secondary = game.cpuBound ? gpuTier : cpuTier;
      fps = game.base[primary - 1] * (PAIR_FACTOR[secondary] || 1);
    }
    return { id: game.id, name: game.name, fps: Math.round(fps) };
  });
}

/** Color bucket for UI bars: smooth (60+), playable (30-59), slideshow (<30). */
export function fpsBucket(fps) {
  if (fps >= 60) return 'smooth';
  if (fps >= 30) return 'playable';
  return 'slideshow';
}
