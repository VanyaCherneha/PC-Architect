import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import LaunchScreen from './components/LaunchScreen';
import ScenarioSelect from './pages/ScenarioSelect';
import Configurator from './pages/Configurator';
import Results from './pages/Results';

function App() {
  const [launched, setLaunched] = useState(false);

  return (
    <div className="app">
      {!launched && <LaunchScreen onLaunch={() => setLaunched(true)} />}
      <Header />
      <Routes>
        <Route path="/" element={<ScenarioSelect />} />
        <Route path="/configurator" element={<Configurator />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </div>
  );
}

export default App;
