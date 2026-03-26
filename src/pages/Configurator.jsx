import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import ComponentCard from '../components/ComponentCard';
import BudgetBar from '../components/BudgetBar';
import CompatibilityBadge from '../components/CompatibilityBadge';
import Walter from '../components/Walter';
import { getCompatibilityStatus } from '../utils/compatibilityChecker';
import allComponents from '../data/components.json';
import bgConfigurator from '../assets/images/bg-configurator.png?update=1';
import './Configurator.css';

const CATEGORIES = ['CPU', 'GPU', 'RAM', 'Mainboard', 'PSU', 'SSD', 'Cooler', 'Case'];

const LOW_TDP_THRESHOLD = 65;

function getScenarioRequirements(scenarioKey, cpuTdp) {
  const optionalCategories = new Set();

  if (scenarioKey === 'office') {
    optionalCategories.add('GPU');
    if (!cpuTdp || cpuTdp <= LOW_TDP_THRESHOLD) {
      optionalCategories.add('Cooler');
    }
  } else if (scenarioKey === 'gaming') {
    // GPU is required for gaming
  } else if (scenarioKey === 'workstation') {
    // GPU is required for workstation
  } else {
    optionalCategories.add('GPU');
  }

  return { optionalCategories };
}

const CATEGORY_ICONS = {
  CPU: '🧠',
  GPU: '🎮',
  RAM: '💾',
  Mainboard: '🔧',
  PSU: '⚡',
  SSD: '💿',
  Cooler: '❄️',
  Case: '📦',
};

function Configurator() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('CPU');
  const [sortOrder, setSortOrder] = useState('price-asc');
  const [tierFilter, setTierFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [lastInsertedCategory, setLastInsertedCategory] = useState(null);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const getWalterSmartHint = (components, scenarioKey, budgetSpent, budgetTotal, activeConflicts) => {
    const cpu = components.CPU;
    const gpu = components.GPU;
    const ram = components.RAM;
    const cooler = components.Cooler;
    const pcCase = components.Case;
    const perfMap = { low: 1, mid: 2, high: 3, ultra: 4 };
    const cpuPerf = cpu ? perfMap[cpu.performanceClass] || 1 : 0;
    const gpuPerf = gpu ? perfMap[gpu.performanceClass] || 1 : 0;
    const ramPerf = ram ? perfMap[ram.performanceClass] || 1 : 0;

    if (activeConflicts && activeConflicts.length > 0) {
      return t('walter_hints.conflict');
    }

    const hasCpu = !!cpu;
    const hasRam = !!ram;
    const hasMainboard = !!components.Mainboard;
    const hasPsu = !!components.PSU;
    const hasStorage = !!components.SSD;
    const hasDisplayPath = !!gpu || (cpu && cpu.hasIGPU === true);
    const buildCanBoot =
      hasCpu && hasRam && hasMainboard && hasPsu && hasStorage && hasDisplayPath;

    if (
      budgetTotal > 0 &&
      budgetSpent / budgetTotal > 0.9 &&
      !buildCanBoot
    ) {
      const missingOrder = ['CPU', 'Mainboard', 'RAM', 'GPU_OR_DISPLAY', 'PSU', 'SSD'];
      let missingKey = null;
      for (const key of missingOrder) {
        if (key === 'CPU' && !hasCpu) {
          missingKey = 'cpu';
          break;
        }
        if (key === 'Mainboard' && !hasMainboard) {
          missingKey = 'mainboard';
          break;
        }
        if (key === 'RAM' && !hasRam) {
          missingKey = 'ram';
          break;
        }
        if (key === 'GPU_OR_DISPLAY' && !hasDisplayPath) {
          missingKey = 'gpu';
          break;
        }
        if (key === 'PSU' && !hasPsu) {
          missingKey = 'psu';
          break;
        }
        if (key === 'SSD' && !hasStorage) {
          missingKey = 'ssd';
          break;
        }
      }
      missingKey = missingKey || 'basic';

      return t('walter_hints.missing_crucial', { partName: t(`walter_hints.parts.${missingKey}`) });
    }

    if (cpu && gpu) {
      if (gpuPerf - cpuPerf >= 2) {
        return t('walter_hints.cpu_bottleneck');
      }
      if (cpuPerf - gpuPerf >= 2) {
        return t('walter_hints.gpu_bottleneck');
      }
    }

    if (scenarioKey === 'workstation') {
      if (cpuPerf <= 2 || ramPerf <= 2) {
        return t('walter_hints.weak_workstation');
      }
    }

    const secondarySpent =
      (cooler ? cooler.price : 0) + (pcCase ? pcCase.price : 0);
    if (budgetTotal > 0 && secondarySpent / budgetTotal > 0.2) {
      if ((cpuPerf <= 2 || !cpu) || (gpuPerf <= 2 || !gpu)) {
        return t('walter_hints.overspent_looks');
      }
    }

    if (budgetTotal > 0 && budgetSpent / budgetTotal < 0.6) {
      if ((cpuPerf <= 2 || !cpu) && (gpuPerf <= 2 || !gpu)) {
        return t('walter_hints.hoarding_budget');
      }
    }

    if (!cpu && !gpu && !ram) {
      return t('walter_hints.no_core');
    }

    return t('walter_hints.solid');
  };

  // Initialize from localStorage or default to false
  const [autoAdvance, setAutoAdvance] = useState(() => {
    return localStorage.getItem('autoAdvance') === 'true';
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('autoAdvance', autoAdvance);
  }, [autoAdvance]);

  useEffect(() => {
    if (!state.selectedScenario) {
      navigate('/');
    }
  }, [state.selectedScenario, navigate]);

  useEffect(() => {
    setSortOrder('price-asc');
    setTierFilter('all');
    setSearchQuery('');
  }, [activeCategory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8) {
        setActiveCategory(CATEGORIES[num - 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (state.timer.timeUp && state.ranOutOfTime) {
      const cpu = state.selectedComponents.CPU;
      const buildComplete =
        cpu &&
        state.selectedComponents.Mainboard &&
        state.selectedComponents.RAM &&
        state.selectedComponents.PSU &&
        state.selectedComponents.SSD &&
        state.selectedComponents.Case &&
        (cpu.hasIGPU || state.selectedComponents.GPU);

      if (!buildComplete) {
        navigate('/results');
      }
    }
  }, [state.timer.timeUp, state.ranOutOfTime, state.selectedComponents, navigate]);

  useEffect(() => {
    if (hintCooldown <= 0) return;
    const id = setInterval(() => {
      setHintCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [hintCooldown]);

  const filteredComponents = allComponents
    .filter((c) => c.category === activeCategory)
    .filter((c) =>
      tierFilter === 'all' ? true : c.performanceClass === tierFilter
    )
    .filter((c) =>
      searchQuery === '' ? true : c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      return 0;
    });

  const handleSelectComponent = (component) => {
    const isAlreadySelected =
      state.selectedComponents[component.category]?.id === component.id;

    if (isAlreadySelected) {
      dispatch({ type: 'REMOVE_COMPONENT', payload: component.category });
    } else {
      dispatch({ type: 'ADD_COMPONENT', payload: component });
      setLastInsertedCategory(component.category);

      // Auto-Advance Logic
      if (autoAdvance) {
        const currentIdx = CATEGORIES.indexOf(component.category);
        if (currentIdx !== -1 && currentIdx < CATEGORIES.length - 1) {
          setTimeout(() => {
            setActiveCategory(CATEGORIES[currentIdx + 1]);
          }, 400);
        }
      }
    }
  };

  const handleRemoveComponent = (category) => {
    dispatch({ type: 'REMOVE_COMPONENT', payload: category });
  };

  const handleAskWalter = () => {
    // Stop and clear the timer when the player submits in time
    dispatch({ type: 'RESET_TIMER' });
    navigate('/results');
  };

  const selectedCount = Object.keys(state.selectedComponents).length;
  const totalCategories = CATEGORIES.length;

  const handleResetBuild = () => {
    if (selectedCount === 0) return;
    if (!window.confirm(t('configurator.confirmReset'))) return;
    dispatch({ type: 'RESET_BUILD' });
  };

  const hintTimerRef = useRef(null);

  const handleHint = () => {
    if (hintCooldown > 0) return;
    setShowHint(true);
    setHintCooldown(3);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setShowHint(false), 5000);
  };

  useEffect(() => {
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, []);

  if (!state.selectedScenario) return null;

  const totalTDP = Object.values(state.selectedComponents).reduce((sum, c) => sum + (c?.category !== 'PSU' ? (c?.tdp || 0) : 0), 0);
  const estimatedDraw = Math.ceil(totalTDP * 0.75);
  const psuWattage = state.selectedComponents.PSU?.wattage || 0;

  const handleToggleCompare = (comp) => {
    setCompareList(prev => {
      const exists = prev.find(c => c.id === comp.id);
      if (exists) return prev.filter(c => c.id !== comp.id);
      if (prev.length >= 3) return prev;
      if (prev.length > 0 && prev[0].category !== comp.category) return prev;
      return [...prev, comp];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const comp = JSON.parse(e.dataTransfer.getData('application/json'));
      if (comp && comp.category) {
        handleSelectComponent(comp);
      }
    } catch {}
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const cpu = state.selectedComponents.CPU;
  const cpuTdp = cpu?.tdp ?? null;
  const { optionalCategories } = getScenarioRequirements(state.selectedScenario, cpuTdp);

  const requiredCategories = CATEGORIES.filter(cat => !optionalCategories.has(cat));
  const allRequiredSelected = requiredCategories.every(cat => !!state.selectedComponents[cat]);
  const hasNoConflicts = state.compatibilityStatus.isCompatible;
  const canAssemble = allRequiredSelected && hasNoConflicts;

  let isAskWalterDisabled = !allRequiredSelected;

  return (
    <div
      className="configurator"
      style={{ backgroundImage: `url(${bgConfigurator})` }}
    >
      <div className="configurator__overlay">
        {/* Left sidebar — categories */}
        <aside className="configurator__sidebar">
          <h2 className="configurator__sidebar-title">{t('configurator.componentsTitle')}</h2>

          <button
            className={`configurator__auto-advance-btn ${autoAdvance ? 'configurator__auto-advance-btn--active' : ''}`}
            onClick={() => setAutoAdvance(!autoAdvance)}
            title={autoAdvance ? t('configurator.autoAdvanceOff') : t('configurator.autoAdvance')}
          >
            {autoAdvance ? '⏭' : '→'} {autoAdvance ? t('configurator.autoAdvance') : t('configurator.autoAdvanceOff')}
          </button>

          <button
            className={`configurator__compare-btn ${compareMode ? 'configurator__compare-btn--active' : ''}`}
            onClick={() => { setCompareMode(!compareMode); if (compareMode) setCompareList([]); }}
          >
            ⚖️ {compareMode ? (t('configurator.compareExit') || 'Exit Compare') : (t('configurator.compare') || 'Compare')}
          </button>

          {CATEGORIES.map((cat, idx) => (
            <button
              key={cat}
              className={`configurator__cat-btn ${activeCategory === cat ? 'configurator__cat-btn--active' : ''} ${state.selectedComponents[cat] ? 'configurator__cat-btn--filled' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <span className="configurator__cat-shortcut">{idx + 1}</span>
              <span className="configurator__cat-icon">{CATEGORY_ICONS[cat]}</span>
              <span className="configurator__cat-name">{cat}</span>
              {state.selectedComponents[cat] && (
                <span className="configurator__cat-check">✓</span>
              )}
            </button>
          ))}
        </aside>

        {/* Center — component grid */}
        <main className="configurator__main">
          <h2 className="configurator__main-title">
            {CATEGORY_ICONS[activeCategory]} {activeCategory}
          </h2>
          <div className="configurator__search-wrapper">
            <span className="configurator__search-icon">🔍</span>
            <input
              type="text"
              className="configurator__search-input"
              placeholder={t('configurator.searchPlaceholder') || `Search ${activeCategory}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="configurator__search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>
          <div className="configurator__filters">
            <div className="configurator__filter-group">
              <span className="configurator__filter-label">
                {t('configurator.sortBy')}
              </span>
              <button
                className={`configurator__filter-btn ${
                  sortOrder === 'price-asc'
                    ? 'configurator__filter-btn--active'
                    : ''
                }`}
                onClick={() => setSortOrder('price-asc')}
              >
                {t('configurator.priceLowHigh')}
              </button>
              <button
                className={`configurator__filter-btn ${
                  sortOrder === 'price-desc'
                    ? 'configurator__filter-btn--active'
                    : ''
                }`}
                onClick={() => setSortOrder('price-desc')}
              >
                {t('configurator.priceHighLow')}
              </button>
            </div>
            <div className="configurator__filter-group">
              <span className="configurator__filter-label">
                {t('configurator.tier')}
              </span>
              {[
                { key: 'all', label: t('configurator.tierAll') },
                { key: 'low', label: t('configurator.tierLow') },
                { key: 'mid', label: t('configurator.tierMid') },
                { key: 'high', label: t('configurator.tierHigh') },
                { key: 'ultra', label: t('configurator.tierUltra') },
              ].map((tier) => (
                <button
                  key={tier.key}
                  className={`configurator__filter-btn ${
                    tierFilter === tier.key
                      ? 'configurator__filter-btn--active'
                      : ''
                  }`}
                  onClick={() => setTierFilter(tier.key)}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
          <div className="configurator__grid">
            {filteredComponents.map((comp) => (
              <ComponentCard
                key={comp.id}
                component={comp}
                isSelected={
                  state.selectedComponents[comp.category]?.id === comp.id
                }
                onSelect={handleSelectComponent}
                compareMode={compareMode}
                isCompared={compareList.some(c => c.id === comp.id)}
                onToggleCompare={handleToggleCompare}
              />
            ))}
          </div>

          {compareMode && compareList.length >= 2 && (
            <button
              className="configurator__compare-open-btn"
              onClick={() => setShowCompareModal(true)}
            >
              ⚖️ {t('configurator.compareNow') || `Compare ${compareList.length} items`}
            </button>
          )}
        </main>

        {/* Right panel — build summary */}
        <aside
          className={`configurator__panel ${dragOver ? 'configurator__panel--drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <h2 className="configurator__panel-title">{t('configurator.yourBuildTitle')}</h2>

          <div className="configurator__progress-ring-wrapper">
            <svg className="configurator__progress-ring" viewBox="0 0 48 48" fill="none">
              <circle className="configurator__progress-ring-bg" cx="24" cy="24" r="20" fill="none" />
              <circle
                className="configurator__progress-ring-fill"
                cx="24" cy="24" r="20"
                fill="none"
                strokeDasharray={`${(selectedCount / 8) * 125.66} 125.66`}
              />
            </svg>
            <span className="configurator__progress-text">{selectedCount}/8</span>
          </div>

          <div className="configurator__build-list overflow-y-auto max-h-[40vh] pr-2 shrink-0">
            {CATEGORIES.map((cat) => {
              const comp = state.selectedComponents[cat];
              const isOptional = optionalCategories.has(cat);
              const isRequired = !isOptional;
              return (
                <div
                  key={cat}
                  className={`configurator__build-item ${
                    comp ? 'configurator__build-item--filled' : isRequired ? 'configurator__build-item--required' : 'configurator__build-item--optional'
                  } ${
                    comp && lastInsertedCategory === cat ? 'configurator__build-item--just-added' : ''
                  }`}
                >
                  <span className="configurator__build-cat">
                    {CATEGORY_ICONS[cat]} {cat}
                  </span>
                  {comp ? (
                    <div className="configurator__build-detail">
                      <span className="configurator__build-name">{comp.name}</span>
                      <div className="configurator__build-meta">
                        <span className="configurator__build-price">
                          CHF {comp.price}
                        </span>
                        <button
                          className="configurator__build-remove"
                          onClick={() => handleRemoveComponent(cat)}
                          title={t('configurator.remove')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="configurator__build-empty">
                      {isRequired ? t('configurator.required') : t('configurator.optional')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-[#141925] pt-4 pb-2 z-10 flex flex-col mt-auto w-full">
            <div className="configurator__budget-header">
              <BudgetBar spent={state.budget.spent} total={state.budget.total} />
              <button className="configurator__reset-btn" onClick={handleResetBuild} title={t('configurator.clearBuild')}>{t('configurator.clearBuild')}</button>
            </div>

            <div className="configurator__power-tracker">
              <div className="power-tracker__label">{t('configurator.estSystemDraw', { draw: estimatedDraw, psuWattage: psuWattage ? `${psuWattage}W (PSU)` : `--- W` })}</div>
              <div className="power-tracker__bar">
                <div className="power-tracker__fill" style={{ width: psuWattage ? `${Math.min((estimatedDraw / psuWattage) * 100, 100)}%` : '100%', backgroundColor: psuWattage ? (estimatedDraw > psuWattage ? '#ff4d4d' : '#00ffcc') : '#808080' }}></div>
              </div>
            </div>

            <CompatibilityBadge status={state.compatibilityStatus} />

            <div className="configurator__actions">
              <button
                className={`configurator__hint-btn ${
                  hintCooldown > 0 ? 'configurator__hint-btn--cooldown' : ''
                }`}
                onClick={handleHint}
                disabled={hintCooldown > 0}
                title={t('configurator.hintTooltip')}
              >
                💡 {hintCooldown > 0 ? t('configurator.hintLoading') : t('configurator.hint')}
              </button>
              <button
                className={`configurator__assemble-btn ${
                  canAssemble ? 'configurator__assemble-btn--ready' : ''
                }`}
                onClick={handleAskWalter}
                disabled={!canAssemble}
                title={canAssemble ? t('configurator.assembleBuildTooltip') : t('configurator.assembleNotReady')}
              >
                {canAssemble ? '🚀 ' : '🔒 '}{t('configurator.assembleBuild')}
              </button>
            </div>
          </div>

          {showHint && (
            <div className="configurator__hint-popup">
              <button className="configurator__hint-close" onClick={() => setShowHint(false)}>✕</button>
              <p>{getWalterSmartHint(
                state.selectedComponents,
                state.selectedScenario,
                state.budget.spent,
                state.budget.total,
                getCompatibilityStatus(state.selectedComponents, t).errors
              )}</p>
            </div>
          )}

          <div className="configurator__walter-corner">
            <Walter emotion={state.walterEmotion} size="small" />
          </div>
        </aside>

        {showCompareModal && compareList.length >= 2 && (
          <div className="configurator__compare-overlay" onClick={() => setShowCompareModal(false)}>
            <div className="configurator__compare-modal" onClick={(e) => e.stopPropagation()}>
              <div className="configurator__compare-header">
                <h3>⚖️ {t('configurator.comparison') || 'Component Comparison'}</h3>
                <button className="configurator__compare-close" onClick={() => setShowCompareModal(false)}>✕</button>
              </div>
              <table className="configurator__compare-table">
                <thead>
                  <tr>
                    <th>{t('configurator.spec') || 'Spec'}</th>
                    {compareList.map(c => <th key={c.id}>{c.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr><td>{t('configurator.tier') || 'Tier'}</td>{compareList.map(c => <td key={c.id}><span className={`component-card__perf component-card__perf--${c.performanceClass}`}>{c.performanceClass?.toUpperCase()}</span></td>)}</tr>
                  <tr><td>{t('componentCard.price', { price: '' }).replace(': CHF ', '')}</td>{compareList.map(c => <td key={c.id}>CHF {c.price}</td>)}</tr>
                  {compareList.some(c => c.socket) && <tr><td>Socket</td>{compareList.map(c => <td key={c.id}>{c.socket || '—'}</td>)}</tr>}
                  {compareList.some(c => c.tdp) && <tr><td>TDP</td>{compareList.map(c => <td key={c.id}>{c.tdp ? `${c.tdp}W` : '—'}</td>)}</tr>}
                  {compareList.some(c => c.ramType) && <tr><td>RAM Type</td>{compareList.map(c => <td key={c.id}>{c.ramType || '—'}</td>)}</tr>}
                  {compareList.some(c => c.wattage) && <tr><td>Wattage</td>{compareList.map(c => <td key={c.id}>{c.wattage ? `${c.wattage}W` : '—'}</td>)}</tr>}
                  {compareList.some(c => c.capacity) && <tr><td>Capacity</td>{compareList.map(c => <td key={c.id}>{c.capacity || '—'}</td>)}</tr>}
                  {compareList.some(c => c.coolerTdpRating) && <tr><td>Cooling</td>{compareList.map(c => <td key={c.id}>{c.coolerTdpRating ? `${c.coolerTdpRating}W` : '—'}</td>)}</tr>}
                  {compareList.some(c => c.length) && <tr><td>Length</td>{compareList.map(c => <td key={c.id}>{c.length ? `${c.length}mm` : '—'}</td>)}</tr>}
                  {compareList.some(c => c.height) && <tr><td>Height</td>{compareList.map(c => <td key={c.id}>{c.height ? `${c.height}mm` : '—'}</td>)}</tr>}
                  <tr><td>Specs</td>{compareList.map(c => <td key={c.id} className="configurator__compare-specs">{c.specs}</td>)}</tr>
                </tbody>
              </table>
              <div className="configurator__compare-actions">
                <button onClick={() => { setCompareList([]); setShowCompareModal(false); setCompareMode(false); }}>{t('configurator.clearCompare') || 'Close & Clear'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Configurator;
