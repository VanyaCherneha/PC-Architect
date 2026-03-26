import { useTranslation } from 'react-i18next';
import './BudgetBar.css';

function BudgetBar({ spent, total }) {
  const { t } = useTranslation();
  const percentage = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const isOverBudget = spent > total;
  const remaining = total - spent;

  return (
    <div className="budget-bar">
      <div className="budget-bar__labels">
        <span className="budget-bar__title">{t('budgetBar.title')}</span>
        <span className={`budget-bar__amount ${isOverBudget ? 'budget-bar__amount--over' : ''}`}>
          CHF {spent} / {total}
        </span>
      </div>

      <div className="budget-bar__track">
        <div
          className={`budget-bar__fill ${isOverBudget ? 'budget-bar__fill--over' : ''}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="budget-bar__remaining">
        {isOverBudget ? (
          <span className="budget-bar__warning">{t('budgetBar.overBudget', { remaining: Math.abs(remaining) })}</span>
        ) : (
          <span>{t('budgetBar.remaining', { remaining })}</span>
        )}
      </div>
    </div>
  );
}

export default BudgetBar;
