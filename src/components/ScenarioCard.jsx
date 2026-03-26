import { useTranslation } from 'react-i18next';
import './ScenarioCard.css';

function ScenarioCard({ title, budget, glowColor, description, onClick }) {
  const { t } = useTranslation();
  return (
    <div
      className="scenario-card"
      style={{ '--glow-color': glowColor }}
      onClick={onClick}
    >
      <div className="scenario-card__glow" />
      <div className="scenario-card__content">
        <h2 className="scenario-card__title">{title}</h2>
        <p className="scenario-card__description">{description}</p>
        <div className="scenario-card__budget">
          <span className="scenario-card__budget-label">{t('scenarioCard.budget')}</span>
          <span className="scenario-card__budget-value">CHF {budget}</span>
        </div>
        <button className="scenario-card__btn">{t('scenarioCard.select')}</button>
      </div>
    </div>
  );
}

export default ScenarioCard;
