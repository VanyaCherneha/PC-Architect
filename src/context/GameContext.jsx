import { createContext, useContext, useReducer, useMemo } from 'react';
import { getCompatibilityStatus, SCENARIOS } from '../utils/compatibilityChecker';

const GameContext = createContext(null);

const DIFFICULTY_PRESETS = {
  easy: 10 * 60,
  normal: 5 * 60,
  hard: 3 * 60,
  impossible: 1 * 60,
  goat: 30,
};

const initialState = {
  selectedScenario: null,      // 'office' | 'gaming' | 'workstation'
  selectedComponents: {},       // { CPU: {...}, GPU: {...}, ... }
  budget: { total: 0, spent: 0 },
  compatibilityStatus: { isCompatible: true, errors: [] },
  walterEmotion: 'thinking',   // 'excited' | 'thumbs' | 'disappointed' | 'thinking'
  difficulty: 'normal',
  timer: {
    totalSeconds: 0,
    remainingSeconds: 0,
    isRunning: false,
    timeUp: false,
  },
  ranOutOfTime: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_SCENARIO': {
      const scenario = SCENARIOS[action.payload];
      const difficulty = state.difficulty || 'normal';
      const totalSeconds =
        DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.normal;
      return {
        ...initialState,
        selectedScenario: action.payload,
        budget: { total: scenario?.budget || 0, spent: 0 },
        difficulty,
        timer: {
          totalSeconds,
          remainingSeconds: totalSeconds,
          isRunning: false,
          timeUp: false,
        },
        ranOutOfTime: false,
      };
    }

    case 'SET_DIFFICULTY': {
      const difficulty = action.payload;
      if (!DIFFICULTY_PRESETS[difficulty]) return state;
      return {
        ...state,
        difficulty,
        timer: {
          totalSeconds: DIFFICULTY_PRESETS[difficulty],
          remainingSeconds: DIFFICULTY_PRESETS[difficulty],
          isRunning: false,
          timeUp: false,
        },
        ranOutOfTime: false,
      };
    }

    case 'START_TIMER': {
      const difficulty = state.difficulty || 'normal';
      const totalSeconds =
        action.payload?.totalSeconds ?? DIFFICULTY_PRESETS[difficulty] ?? DIFFICULTY_PRESETS.normal;
      return {
        ...state,
        timer: {
          totalSeconds,
          remainingSeconds: totalSeconds,
          isRunning: true,
          timeUp: false,
        },
        ranOutOfTime: false,
      };
    }

    case 'TICK_TIMER': {
      if (!state.timer.isRunning) return state;
      const nextRemaining = Math.max(state.timer.remainingSeconds - 1, 0);
      const timeUp = nextRemaining === 0;
      return {
        ...state,
        timer: {
          ...state.timer,
          remainingSeconds: nextRemaining,
          isRunning: timeUp ? false : state.timer.isRunning,
          timeUp,
        },
        ranOutOfTime: timeUp ? true : state.ranOutOfTime,
      };
    }

    case 'RESET_TIMER': {
      const difficulty = state.difficulty || 'normal';
      const totalSeconds =
        state.timer.totalSeconds ||
        DIFFICULTY_PRESETS[difficulty] ||
        DIFFICULTY_PRESETS.normal;
      return {
        ...state,
        timer: {
          totalSeconds,
          remainingSeconds: totalSeconds,
          isRunning: false,
          timeUp: false,
        },
        ranOutOfTime: false,
      };
    }

    case 'RESTART_TIMER': {
      if (!state.timer.totalSeconds) return state;
      return {
        ...state,
        timer: {
          ...state.timer,
          remainingSeconds: state.timer.totalSeconds,
          isRunning: true,
          timeUp: false,
        },
        ranOutOfTime: false,
      };
    }

    case 'ADD_COMPONENT': {
      const component = action.payload;
      const updatedComponents = {
        ...state.selectedComponents,
        [component.category]: component,
      };

      const spent = Object.values(updatedComponents).reduce(
        (sum, c) => (c ? sum + c.price : sum),
        0
      );

      const compatibilityStatus = getCompatibilityStatus(updatedComponents);

      return {
        ...state,
        selectedComponents: updatedComponents,
        budget: { ...state.budget, spent },
        compatibilityStatus,
        walterEmotion: compatibilityStatus.isCompatible ? 'thinking' : 'disappointed',
      };
    }

    case 'REMOVE_COMPONENT': {
      const category = action.payload;
      const updatedComponents = { ...state.selectedComponents };
      delete updatedComponents[category];

      const spent = Object.values(updatedComponents).reduce(
        (sum, c) => (c ? sum + c.price : sum),
        0
      );

      const compatibilityStatus = getCompatibilityStatus(updatedComponents);

      return {
        ...state,
        selectedComponents: updatedComponents,
        budget: { ...state.budget, spent },
        compatibilityStatus,
        walterEmotion: 'thinking',
      };
    }

    case 'SET_WALTER_EMOTION':
      return { ...state, walterEmotion: action.payload };

    case 'RESET_BUILD':
      return {
        ...initialState,
        selectedScenario: state.selectedScenario,
        budget: { total: state.budget.total, spent: 0 },
        difficulty: state.difficulty,
        timer: state.timer,
        ranOutOfTime: state.ranOutOfTime,
      };

    case 'FULL_RESET':
      return { ...initialState };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
