import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ScenarioCard from '../components/ScenarioCard';
import bgScenario from '../assets/images/bg-scenario.png?update=1';
import './ScenarioSelect.css';

const scenarios = [
  {
    key: 'office',
    budget: 600,
    glowColor: '#2E75B6',
  },
  {
    key: 'gaming',
    budget: 1500,
    glowColor: '#B62E8A',
  },
  {
    key: 'workstation',
    budget: 2500,
    glowColor: '#00FFFF',
  },
];

function ScenarioSelect() {
  const { t } = useTranslation();
  const { state, dispatch } = useGame();
  const navigate = useNavigate();

  const handleSelect = (scenarioKey) => {
    dispatch({ type: 'SET_SCENARIO', payload: scenarioKey });
    dispatch({ type: 'START_TIMER' });
    navigate('/configurator');
  };

  const handleDifficultyChange = (difficultyKey) => {
    dispatch({ type: 'SET_DIFFICULTY', payload: difficultyKey });
  };

  return (
    <div
      className="scenario-select"
      style={{ backgroundImage: `url(${bgScenario})` }}
    >
      <div className="scenario-select__overlay">
        <div className="scenario-select__hero">
          <h1 className="scenario-select__title">{t('scenarioSelect.title')}</h1>
          <p className="scenario-select__subtitle">
            {t('scenarioSelect.subtitle')}
          </p>
        </div>

        <div className="scenario-select__cards">
          {scenarios.map((s) => (
            <ScenarioCard
              key={s.key}
              title={t(`scenarioSelect.scenarios.${s.key}.title`)}
              budget={s.budget}
              glowColor={s.glowColor}
              description={t(`scenarioSelect.scenarios.${s.key}.description`)}
              onClick={() => handleSelect(s.key)}
            />
          ))}
        </div>

        <div className="scenario-select__difficulty">
          <h2 className="scenario-select__difficulty-title">
            {t('scenarioSelect.difficultyTitle')}
          </h2>
          <div className="scenario-select__difficulty-buttons">
            {[
              { key: 'easy', label: t('scenarioSelect.difficulty.easy'), color: 'green' },
              { key: 'normal', label: t('scenarioSelect.difficulty.normal'), color: 'cyan' },
              { key: 'hard', label: t('scenarioSelect.difficulty.hard'), color: 'orange' },
              { key: 'impossible', label: t('scenarioSelect.difficulty.impossible'), color: 'red' },
              { key: 'goat', label: t('scenarioSelect.difficulty.goat'), color: 'purple' },
            ].map((d) => (
              <button
                key={d.key}
                className={`scenario-select__difficulty-btn scenario-select__difficulty-btn--${d.key} ${
                  state.difficulty === d.key ? 'scenario-select__difficulty-btn--active' : ''
                }`}
                onClick={() => handleDifficultyChange(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScenarioSelect;
