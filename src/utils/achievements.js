/**
 * PC Architect — Achievements
 * Unlock conditions are checked once per finished build on the Results
 * screen. Unlocked achievements persist in localStorage.
 */

const STORAGE_KEY = 'pc-architect-achievements';

export const ACHIEVEMENTS = [
  { id: 'first_build', icon: '🏗️' },
  { id: 'walters_favorite', icon: '🏆' },
  { id: 'disaster_artist', icon: '💥' },
  { id: 'fire_hazard', icon: '🔥' },
  { id: 'speed_demon', icon: '⚡' },
  { id: 'penny_pincher', icon: '🪙' },
  { id: 'big_spender', icon: '💸' },
  { id: 'completionist', icon: '🧩' },
  { id: 'goat_survivor', icon: '🐐' },
];

/**
 * Evaluate which achievements this build earns.
 * @param {number} score - final local build score (0-100)
 * @param {object} state - GameContext state at the time of submission
 * @returns {string[]} earned achievement ids
 */
export function evaluateAchievements(score, state) {
  const build = state.selectedComponents;
  const earned = ['first_build'];

  const totalTdp = Object.values(build).reduce(
    (sum, c) => (c && c.category !== 'PSU' ? sum + (c.tdp || 0) : sum),
    0
  );
  const psuHeadroom = build.PSU ? build.PSU.wattage - totalTdp : null;

  if (score >= 90) earned.push('walters_favorite');
  if (score < 30) earned.push('disaster_artist');
  if (psuHeadroom !== null && psuHeadroom < 0) earned.push('fire_hazard');
  if (
    !state.ranOutOfTime &&
    state.timer.totalSeconds > 0 &&
    state.timer.remainingSeconds / state.timer.totalSeconds >= 0.5
  ) {
    earned.push('speed_demon');
  }
  if (
    state.budget.total > 0 &&
    state.budget.spent <= state.budget.total * 0.7 &&
    score >= 75
  ) {
    earned.push('penny_pincher');
  }
  if (state.budget.total > 0 && state.budget.spent > state.budget.total) {
    earned.push('big_spender');
  }
  if (Object.keys(build).length >= 8) earned.push('completionist');
  if (state.difficulty === 'goat' && score >= 50 && !state.ranOutOfTime) {
    earned.push('goat_survivor');
  }

  return earned;
}

function loadUnlocked() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * Persist earned achievements. Returns which ones are new this run
 * and the full unlocked set, so the UI can highlight fresh unlocks.
 */
export function unlockAchievements(earnedIds) {
  const unlocked = loadUnlocked();
  const newlyUnlocked = earnedIds.filter((id) => !unlocked[id]);
  if (newlyUnlocked.length > 0) {
    for (const id of newlyUnlocked) {
      unlocked[id] = Date.now();
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
      // storage full or blocked - achievements just won't persist
    }
  }
  return { newlyUnlocked, allUnlocked: Object.keys(unlocked) };
}
