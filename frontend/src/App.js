import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { FarmDataProvider } from "./hooks/useFarmData";
import { SettingsProvider } from "./hooks/useSettings";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import CropDetails from "./pages/CropDetails";
import AddCrop from "./pages/AddCrop";
import FarmIntelligence from "./pages/FarmIntelligence";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import SettingsPage from "./pages/Settings";

function App() {
  return (
    <SettingsProvider>
      <FarmDataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crop/:cropId" element={<CropDetails />} />
            <Route path="/add-crop" element={<AddCrop />} />
            <Route path="/intelligence" element={<FarmIntelligence />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Router>
      </FarmDataProvider>
    </SettingsProvider>
  );
}

export default App;
