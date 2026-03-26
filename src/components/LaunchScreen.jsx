import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import bgScenario from '../assets/images/bg-scenario.png?update=1';
import './LaunchScreen.css';

function LaunchScreen({ onLaunch }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handlePlay = useCallback(async () => {
    setLoading(true);

    // Request fullscreen on the root element
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      }
    } catch {
      // Fullscreen denied or not supported — still continue
    }

    onLaunch();
  }, [onLaunch]);

  return (
    <div
      className="launch-screen"
      style={{ backgroundImage: `url(${bgScenario})` }}
    >
      <div className="launch-screen__overlay">
        <div className="launch-screen__content">
          <div className="launch-screen__glow-ring" />
          <h1 className="launch-screen__title">{t('launchScreen.title')}</h1>
          <p className="launch-screen__tagline">
            {t('launchScreen.tagline')}
          </p>

          <button
            className={`launch-screen__btn ${loading ? 'launch-screen__btn--loading' : ''}`}
            onClick={handlePlay}
            disabled={loading}
          >
            {loading ? (
              <span className="launch-screen__btn-text">{t('launchScreen.launching')}</span>
            ) : (
              <>
                <span className="launch-screen__btn-icon">⛶</span>
                <span className="launch-screen__btn-text">{t('launchScreen.playFullscreen')}</span>
              </>
            )}
          </button>

          <button
            className="launch-screen__skip"
            onClick={onLaunch}
          >
            {t('launchScreen.playInWindow')}
          </button>

          <p className="launch-screen__hint" dangerouslySetInnerHTML={{ __html: t('launchScreen.hint') }} />
        </div>
      </div>
    </div>
  );
}

export default LaunchScreen;
