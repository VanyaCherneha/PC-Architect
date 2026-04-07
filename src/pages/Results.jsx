import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { calculateScore, getCompatibilityStatus } from '../utils/compatibilityChecker';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Walter from '../components/Walter';
import bgResults from '../assets/images/bg-results.png?update=3';
import './Results.css';

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

function getWalterEmotion(score) {
  if (score > 80) return 'excited';
  if (score >= 50) return 'thumbs';
  return 'disappointed';
}

function Results() {
  const { t, i18n } = useTranslation();
  const { state, dispatch } = useGame();
  const navigate = useNavigate();
  const [walterMessage, setWalterMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [assembling, setAssembling] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!state.selectedScenario) {
      navigate('/');
      return;
    }

    const assembleTimer = setTimeout(() => setAssembling(false), 2200);
    return () => clearTimeout(assembleTimer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.selectedScenario && !assembling) return;
    
    const buildScoreData = calculateScore(
      state.selectedComponents,
      state.selectedScenario,
      { ranOutOfTime: state.ranOutOfTime }
    );
    setScore(buildScoreData.score);
    const emotion = getWalterEmotion(buildScoreData.score);
    dispatch({ type: 'SET_WALTER_EMOTION', payload: emotion });

    fetchWalterFeedback(buildScoreData);
  }, [i18n.language]);

  useEffect(() => {
    if (assembling) return;
    let current = 0;
    const target = score;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    const stepTime = duration / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setDisplayScore(Math.round(current));
    }, stepTime);
    return () => clearInterval(timer);
  }, [score, assembling]);

  const fetchWalterFeedback = async (buildScoreData) => {
    setLoading(true);
    const { score, maxAllowed } = buildScoreData;

    const totalTdp = Object.values(state.selectedComponents).reduce((sum, c) => (c && c.category !== 'PSU' ? sum + (c.tdp || 0) : sum), 0);
    const psuWattage = state.selectedComponents.PSU ? state.selectedComponents.PSU.wattage : 0;
    const psuHeadroom = state.selectedComponents.PSU ? psuWattage - totalTdp : 0;
    const { errors, warnings } = getCompatibilityStatus(state.selectedComponents);
    const compatibilityIssues = [...(errors || []), ...(warnings || [])];

    const buildData = {
      cpu: state.selectedComponents.CPU ? { name: state.selectedComponents.CPU.name, tdp: state.selectedComponents.CPU.tdp, hasIGPU: state.selectedComponents.CPU.hasIGPU, socket: state.selectedComponents.CPU.socket, performanceClass: state.selectedComponents.CPU.performanceClass } : null,
      gpu: state.selectedComponents.GPU ? { name: state.selectedComponents.GPU.name, tdp: state.selectedComponents.GPU.tdp, performanceClass: state.selectedComponents.GPU.performanceClass } : null,
      ram: state.selectedComponents.RAM ? { name: state.selectedComponents.RAM.name, ramType: state.selectedComponents.RAM.ramType, performanceClass: state.selectedComponents.RAM.performanceClass } : null,
      mainboard: state.selectedComponents.Mainboard ? { name: state.selectedComponents.Mainboard.name, socket: state.selectedComponents.Mainboard.socket, ramType: state.selectedComponents.Mainboard.ramType } : null,
      psu: state.selectedComponents.PSU ? { name: state.selectedComponents.PSU.name, wattage: state.selectedComponents.PSU.wattage } : null,
      ssd: state.selectedComponents.SSD ? { name: state.selectedComponents.SSD.name } : null,
      cooler: state.selectedComponents.Cooler ? { name: state.selectedComponents.Cooler.name } : null,
      case: state.selectedComponents.Case ? { name: state.selectedComponents.Case.name } : null,
      totalTdp,
      psuHeadroom,
      totalCost: state.budget.spent,
      budget: state.budget.total,
      mission: state.selectedScenario === 'office' ? 'Office' : state.selectedScenario === 'gaming' ? 'Gaming' : 'Workstation',
      compatibilityIssues
    };

    const ranOutOfTimeNote = state.ranOutOfTime
      ? 'The player ran out of time. Factor this into your roast.'
      : '';

    const prompt = `You are Walter, a sarcastic, funny, and jaded PC hardware expert. You roast bad decisions harshly but give real advice, and never praise a bad build just to be nice. You speak directly to the player.

Evaluate this PC build strictly according to these rules:
1. Max allowed score based on hard-coded limits: ${maxAllowed}/100.
2. The user's pre-calculated score considering other penalties: ${score}/100.
3. Your FINAL score MUST NOT exceed ${maxAllowed}.
4. Respond in ${i18n.language.startsWith('en') ? 'English' : 'German'} based on the user's selected language.
5. ${ranOutOfTimeNote}

Rules for the ANALYSIS field:
- You must always name the specific problem explicitly and name the exact components involved in the conflict (e.g. "Ryzen 5 5600 + B660M DS3H").
- Always explain WHY it is a problem in one sentence.
- Never use vague phrases like "compatibility issues exist" or "there are problems".
- If multiple issues exist, list each one separately.
- Base your analysis on the "compatibilityIssues" provided in the BUILD DATA, but rewrite them in your sarcastic voice with full context.

BUILD DATA:
${JSON.stringify(buildData, null, 2)}

You MUST respond in this EXACT JSON format (no markdown formatting, just pure JSON):
{
  "verdict": "GREAT" | "DECENT" | "POOR" | "DISASTER",
  "score": number,
  "roast": "1-2 funny sentences about the worst decision",
  "analysis": "3-4 sentences of real technical feedback following the rules above",
  "tip": "One specific upgrade suggestion"
}`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_key_here') {
        const fallback = getFallbackMessage(score);
        setWalterMessage(fallback);
        setScore(fallback.score);
        dispatch({ type: 'SET_WALTER_EMOTION', payload: getWalterEmotion(fallback.score) });
        setLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up markdown markers if Gemini adds them
      text = text.replace(/^\`\`\`json\s*/g, '').replace(/\s*\`\`\`$/g, '');

      try {
        const parsed = JSON.parse(text);
        parsed.score = Math.min(parsed.score || score, maxAllowed);
        setWalterMessage(parsed);
        setScore(parsed.score);
        dispatch({ type: 'SET_WALTER_EMOTION', payload: getWalterEmotion(parsed.score) });
      } catch (e) {
        console.error('Failed to parse Walter JSON:', e, text);
        const fallback = getFallbackMessage(score);
        setWalterMessage(fallback);
        setScore(fallback.score);
        dispatch({ type: 'SET_WALTER_EMOTION', payload: getWalterEmotion(fallback.score) });
      }

    } catch (err) {
      console.error('Gemini API error:', err);
      const fallback = getFallbackMessage(score);
      setWalterMessage(fallback);
      setScore(fallback.score);
      dispatch({ type: 'SET_WALTER_EMOTION', payload: getWalterEmotion(fallback.score) });
    } finally {
      setLoading(false);
    }
  };

  const getFallbackMessage = (s) => {
    // Return an object that matches the exact keys the UI expects, translated dynamically.
    if (s > 80)
      return { verdict: "GREAT", score: s, roast: t('fallback.great.roast'), analysis: t('fallback.great.analysis'), tip: t('fallback.great.tip') };
    if (s >= 50)
      return { verdict: "DECENT", score: s, roast: t('fallback.decent.roast'), analysis: t('fallback.decent.analysis'), tip: t('fallback.decent.tip') };
    return { verdict: "DISASTER", score: s, roast: t('fallback.disaster.roast'), analysis: t('fallback.disaster.analysis'), tip: t('fallback.disaster.tip') };
  };

  const grade = getGrade(score);
  const emotion = getWalterEmotion(score);

  const CATEGORIES = ['CPU', 'GPU', 'RAM', 'Mainboard', 'PSU', 'SSD', 'Cooler', 'Case'];

  // Calculate synthetic performance metrics based on selected components
  const cpuPerf = state.selectedComponents.CPU ? { low: 25, mid: 60, high: 85, ultra: 100 }[state.selectedComponents.CPU.performanceClass] : 0;
  const gpuPerf = state.selectedComponents.GPU ? { low: 25, mid: 60, high: 85, ultra: 100 }[state.selectedComponents.GPU.performanceClass] : 0;
  const ramPerf = state.selectedComponents.RAM ? { low: 30, mid: 65, high: 90, ultra: 100 }[state.selectedComponents.RAM.performanceClass] : 0;

  const gamingPower = Math.round((gpuPerf * 0.6) + (cpuPerf * 0.3) + (ramPerf * 0.1));
  const workstationPower = Math.round((cpuPerf * 0.6) + (ramPerf * 0.3) + (gpuPerf * 0.1));

  if (!state.selectedScenario) return null;

  const handleShareResult = async () => {
    const CATEGORIES_LIST = ['CPU', 'GPU', 'RAM', 'Mainboard', 'PSU', 'SSD', 'Cooler', 'Case'];
    const parts = CATEGORIES_LIST.map(cat => {
      const c = state.selectedComponents[cat];
      return `${cat}: ${c ? `${c.name} (CHF ${c.price})` : '---'}`;
    }).join('\n');
    const walterVerdict = walterMessage?.verdict || '---';
    const text = `🖥️ PC ARCHITECT — ${t(`scenarioSelect.scenarios.${state.selectedScenario}.title`)}

Score: ${score}/100 (Grade: ${grade})
Budget: CHF ${state.budget.spent} / ${state.budget.total}

${parts}

Walter's Verdict: ${walterVerdict}

Built with PC Architect 🎮`;
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  if (assembling) {
    return (
      <div
        className="results results--assembling"
        style={{ backgroundImage: `url(${bgResults})` }}
      >
        <div className="results__assemble-overlay">
          <div className="results__assemble-spinner" />
          <h2 className="results__assemble-text">⚙️ {t('results.assembling') || 'Assembling your PC...'}</h2>
          <div className="results__assemble-parts">
            {['CPU', 'GPU', 'RAM', 'Mainboard', 'PSU', 'SSD', 'Cooler', 'Case'].map((cat, i) => (
              <span
                key={cat}
                className="results__assemble-part"
                style={{ animationDelay: `${i * 0.25}s` }}
              >
                {state.selectedComponents[cat] ? state.selectedComponents[cat].name : cat}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="results"
      style={{ backgroundImage: `url(${bgResults})` }}
    >
      <div className="results__overlay">
        <div className="results__content">
          {/* Walter section */}
          <div className="results__walter-section">
            <Walter
              emotion={emotion}
              size="large"
              speechBubble={loading ? t('results.loadingSubtitle') : null}
            />
          </div>

          {/* Score & feedback */}
          <div className="results__feedback-section">
            <div className="results__score-badge">
              <div className={`results__grade results__grade--${grade.toLowerCase()}`}>
                {grade}
              </div>
              <div className="results__score-value">{displayScore}/100</div>
              {state.ranOutOfTime && (
                <div className="results__timeup-flag">
                  {t('results.timesUp')}
                </div>
              )}
            </div>

            <div className="results__walter-speech">
              <h2 className="results__speech-title">{t('results.walterSays')}</h2>
              {loading ? (
                <div className="results__loading">
                  <span className="results__loading-dot" />
                  <span className="results__loading-dot" />
                  <span className="results__loading-dot" />
                </div>
              ) : (
                <div className="results__speech-text">
                  {typeof walterMessage === 'string' ? (
                    <p>{walterMessage}</p>
                  ) : (
                    <div className="results__json-feedback">
                      <p><strong>{t('results.verdict')}</strong> <span className={`results__verdict-badge results__verdict-badge--${walterMessage.verdict?.toLowerCase()}`}>{t(`results.verdicts.${walterMessage.verdict}`) || walterMessage.verdict}</span></p>
                      <p><strong>{t('results.roast')}</strong> {walterMessage.roast}</p>
                      <p><strong>{t('results.analysis')}</strong> {walterMessage.analysis}</p>
                      <p><strong>{t('results.proTip')}</strong> {walterMessage.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Build summary table */}
            <div className="results__summary">
              <h3 className="results__summary-title">{t('results.buildSummary')}</h3>
              <table className="results__table">
                <thead>
                  <tr>
                    <th>{t('results.category')}</th>
                    <th>{t('results.component')}</th>
                    <th>{t('results.price')}</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((cat) => {
                    const comp = state.selectedComponents[cat];
                    return (
                      <tr key={cat} className={!comp ? 'results__table-row--empty' : ''}>
                        <td>{cat}</td>
                        <td>{comp ? comp.name : <span className="results__empty-tag">{t('results.missing')}</span>}</td>
                        <td>{comp ? `CHF ${comp.price}` : '---'}</td>
                      </tr>
                    );
                  })}
                  <tr className="results__table-total">
                    <td colSpan="2"><strong>{t('results.total')}</strong></td>
                    <td><strong>CHF {state.budget.spent}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Performance Indicators */}
            <div className="results__performance">
              <h3 className="results__summary-title">{t('results.estPerformance')}</h3>
              <div className="results__perf-bar-wrapper">
                <span className="results__perf-label">{t('results.gaming')}</span>
                <div className="results__perf-bar">
                  <div className="results__perf-fill results__perf-fill--gaming" style={{ width: `${gamingPower}%` }}></div>
                </div>
              </div>
              <div className="results__perf-bar-wrapper">
                <span className="results__perf-label">{t('results.workstation')}</span>
                <div className="results__perf-bar">
                  <div className="results__perf-fill results__perf-fill--work" style={{ width: `${workstationPower}%` }}></div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="results__actions">
              <button
                className="results__btn results__btn--share"
                onClick={handleShareResult}
              >
                {shareCopied ? t('results.shareCopied') : t('results.shareResult')}
              </button>
              <button
                className="results__btn results__btn--retry"
                onClick={() => {
                dispatch({ type: 'RESET_BUILD' });
                dispatch({ type: 'RESTART_TIMER' });
                navigate('/configurator');
              }}
              >
                {t('results.tryAgain')}
              </button>
              <button
                className="results__btn results__btn--new"
                onClick={() => {
                  dispatch({ type: 'FULL_RESET' });
                  navigate('/');
                }}
              >
                {t('results.newScenario')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Results;
