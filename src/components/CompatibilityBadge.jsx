import { useTranslation } from 'react-i18next';
import './CompatibilityBadge.css';

function CompatibilityBadge({ status }) {
  const { t } = useTranslation();
  const { isCompatible, errors } = status;

  return (
    <div className={`compat-badge ${isCompatible ? 'compat-badge--ok' : 'compat-badge--conflict'}`}>
      <div className="compat-badge__header">
        <span className="compat-badge__icon">{isCompatible ? '✅' : '❌'}</span>
        <span className="compat-badge__label">
          {isCompatible ? t('compatibilityBadge.allCompatible') : t('compatibilityBadge.conflictDetected')}
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
    </div>
  );
}

export default CompatibilityBadge;
