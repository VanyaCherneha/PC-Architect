import { useTranslation } from 'react-i18next';
import './CompatibilityBadge.css';

function CompatibilityBadge({ status }) {
  const { t } = useTranslation();
  const { isCompatible, errors, warnings = [] } = status;

  return (
    <div className={`compat-badge ${isCompatible ? (warnings.length > 0 ? 'compat-badge--warn' : 'compat-badge--ok') : 'compat-badge--conflict'}`}>
      <div className="compat-badge__header">
        <span className="compat-badge__icon">{isCompatible ? (warnings.length > 0 ? '⚠️' : '✅') : '❌'}</span>
        <span className="compat-badge__label">
          {isCompatible
            ? (warnings.length > 0 ? t('compatibilityBadge.warnings', 'Tips from Walter') : t('compatibilityBadge.allCompatible'))
            : t('compatibilityBadge.conflictDetected')}
        </span>
      </div>

      {errors.length > 0 && (
        <ul className="compat-badge__errors">
          {errors.map((err, i) => (
            <li key={i} className="compat-badge__error">
              {err}
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="compat-badge__warnings" style={{ marginTop: '0.5rem', listStyle: 'none', paddingLeft: 0 }}>
          {warnings.map((warn, i) => (
            <li key={i} className="compat-badge__warning" style={{ color: 'var(--color-yellow)', fontSize: '0.8rem', padding: '0.25rem 0', borderTop: '1px solid rgba(255, 214, 0, 0.15)', lineHeight: 1.4 }}>
              💡 {warn}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CompatibilityBadge;
