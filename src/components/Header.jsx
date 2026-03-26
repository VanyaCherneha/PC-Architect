import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return `${mm}:${ss}`;
}

function Header() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'de' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Keep button state in sync when user exits fullscreen via Esc
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!state.timer.isRunning) return;
    const id = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(id);
  }, [state.timer.isRunning, dispatch]);

  const handleReset = () => {
    dispatch({ type: 'FULL_RESET' });
    navigate('/');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignored — browser may block if no user gesture
    }
  };

  return (
    <header className="header">
      <div className="header__logo" onClick={handleReset}>
        <span className="header__icon">🖥️</span>
        <h1 className="header__title">PC ARCHITECT</h1>
      </div>

      <div className="header__right">
        {state.selectedScenario && location.pathname !== '/' && (
          <div className="header__info">
            <span className="header__scenario">
              {t(`scenarioSelect.scenarios.${state.selectedScenario}.title`)}
            </span>
            <span className="header__budget">
              {t('header.budget', { spent: state.budget.spent, total: state.budget.total })}
            </span>
            {state.timer.totalSeconds > 0 && (
              <span
                className={`header__timer ${
                  state.timer.remainingSeconds <= 10
                    ? 'header__timer--danger'
                    : state.timer.remainingSeconds <= 30
                    ? 'header__timer--warning'
                    : ''
                }`}
              >
                ⏱ {formatTime(state.timer.remainingSeconds)}
              </span>
            )}
          </div>
        )}

        <button
          className="header__btn"
          onClick={toggleLanguage}
          title="Toggle Language"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginRight: '1rem', padding: '0.5rem', color: 'var(--color-neon)' }}
        >
          {i18n.language.startsWith('en') ? 'DE' : 'EN'}
        </button>

        <button
          className={`header__fs-btn ${isFullscreen ? 'header__fs-btn--active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
        >
          {isFullscreen ? '⛶' : '⬜'}
          <span className="header__fs-label">
            {isFullscreen ? t('header.exitFs') : t('header.fullScreen')}
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
