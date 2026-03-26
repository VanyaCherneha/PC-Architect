import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './ComponentCard.css';

function ComponentCard({ component, isSelected, onSelect, compareMode, isCompared, onToggleCompare }) {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 350);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = () => {
    if (compareMode) {
      onToggleCompare?.(component);
    } else {
      onSelect(component);
    }
  };

  const specs = [
    component.socket ? { label: 'Socket', value: component.socket } : null,
    component.tdp ? { label: 'TDP', value: `${component.tdp}W` } : null,
    component.wattage ? { label: 'Wattage', value: `${component.wattage}W` } : null,
    component.ramType ? { label: 'RAM', value: component.ramType } : null,
    component.coolerTdpRating ? { label: t('componentCard.coolingPower', { rating: component.coolerTdpRating }).split(':')[0], value: `${component.coolerTdpRating}W` } : null,
    component.length ? { label: t('componentCard.length', { length: '' }).split(':')[0], value: `${component.length}mm` } : null,
    component.height ? { label: t('componentCard.height', { height: '' }).split(':')[0], value: `${component.height}mm` } : null,
    component.hasIGPU !== undefined ? { label: 'iGPU', value: component.hasIGPU ? t('componentCard.yes') : t('componentCard.no') } : null,
    component.capacity ? { label: 'Capacity', value: component.capacity } : null,
  ].filter(Boolean);

  return (
    <div
      className={`component-card ${isSelected ? 'component-card--selected' : ''} ${isCompared ? 'component-card--compared' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      draggable
      onDragStart={handleDragStart}
    >
      {compareMode && (
        <span className="component-card__compare-badge">
          {isCompared ? '✓ VS' : '+ VS'}
        </span>
      )}
      <div className="component-card__header">
        <span className="component-card__category">{component.category}</span>
        <span className={`component-card__perf component-card__perf--${component.performanceClass}`}>
          {component.performanceClass?.toUpperCase()}
        </span>
      </div>

      <h3 className="component-card__name">{component.name}</h3>
      <p className="component-card__specs">{component.specs}</p>

      <div className="component-card__footer">
        <span className="component-card__price">CHF {component.price}</span>
        {isSelected && <span className="component-card__check">✓</span>}
      </div>

      {showTooltip && specs.length > 0 && (
        <div className="component-card__tooltip">
          <div className="component-card__tooltip-title">{component.name}</div>
          <div className="component-card__tooltip-grid">
            {specs.map((s, i) => (
              <div key={i} className="component-card__tooltip-row">
                <span className="component-card__tooltip-label">{s.label}</span>
                <span className="component-card__tooltip-value">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="component-card__tooltip-price">CHF {component.price}</div>
        </div>
      )}
    </div>
  );
}

export default ComponentCard;
