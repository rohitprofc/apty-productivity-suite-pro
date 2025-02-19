import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, StickyNote, Folder } from "lucide-react";
import AdBlocker from "../components/AdBlocker";
import ProductivityTracker from "../components/ProductivityTracker";
import NotesManager from "../components/NotesManager";
import TabManager from "../components/TabManager";
import ToggleSwitch from "../components/ToggleSwitch";

const SidePanel = () => {
  const [activeFeature, setActiveFeature] = useState("adBlocker");
  const [isGlobalEnabled, setIsGlobalEnabled] = useState(true);
  const [featureToggles, setFeatureToggles] = useState({
    adBlocker: true,
    productivityTracker: true,
  });

  useEffect(() => {
    chrome.storage.local.get(["lastFeature", "featureToggles", "isGlobalEnabled"], (result) => {
      if (result.lastFeature) setActiveFeature(result.lastFeature);
      if (result.featureToggles) setFeatureToggles(result.featureToggles);
      if (typeof result.isGlobalEnabled !== "undefined") {
        setIsGlobalEnabled(result.isGlobalEnabled);
      }
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ lastFeature: activeFeature });
  }, [activeFeature]);

  const toggleFeature = (feature) => {
    setFeatureToggles((prev) => {
      const updatedToggles = { ...prev, [feature]: !prev[feature] };
      const allEnabled = updatedToggles.adBlocker && updatedToggles.productivityTracker;
      setIsGlobalEnabled(allEnabled);
      chrome.storage.local.set({ featureToggles: updatedToggles, isGlobalEnabled: allEnabled });
      return updatedToggles;
    });
  };

  const toggleGlobal = () => {
    const newState = !isGlobalEnabled;
    setIsGlobalEnabled(newState);
    const updatedToggles = { adBlocker: newState, productivityTracker: newState };
    setFeatureToggles(updatedToggles);
    chrome.storage.local.set({ featureToggles: updatedToggles, isGlobalEnabled: newState });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="w-full p-6 bg-[#F9F9F9] text-[#333]">
      <div className="flex flex-col items-center mb-4">
        <img src={chrome.runtime.getURL("logo.png")} alt="Apty Logo" className="w-20 h-auto mb-2" />
        <h1 className="text-2xl font-bold text-[#E04A2F] text-center">Productivity Suite</h1>
      </div>
      <div className="flex justify-between items-center mb-4 p-3 bg-white rounded-xl shadow-sm border border-[#E04A2F]">
        <span className="text-lg font-medium">Productive Mode</span>
        <ToggleSwitch isChecked={isGlobalEnabled} onChange={toggleGlobal} />
      </div>
      <div className="flex justify-center gap-4 mb-4">
  {[
    { key: "adBlocker", label: "Ad Blocker", Icon: ShieldCheck },
    { key: "productivityTracker", label: "Productivity Tracker", Icon: Clock },
    { key: "notesManager", label: "Smart Notes", Icon: StickyNote },
    { key: "tabManager", label: "Tab Manager", Icon: Folder },
  ].map(({ key, label, Icon }) => (
    <motion.button
      key={key}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center p-3 w-20 h-20 rounded-2xl transition-all font-medium focus:outline-none focus:ring-2 focus:ring-[#E04A2F] ${
        activeFeature === key
          ? "bg-[#E04A2F] text-white border border-white shadow-md"
          : "bg-[#FFF] text-[#333] border border-gray-300 hover:bg-[#E04A2F] hover:text-white"
      }`}
      onClick={() => setActiveFeature(key)}
    >
      <Icon size={28} />
      <span className="text-xs mt-1">{label}</span>

      {/* Status Dot */}
      {["adBlocker", "productivityTracker"].includes(key) && featureToggles[key] && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-md" />
      )}
    </motion.button>
  ))}
</div>

      <motion.div key={activeFeature} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }} className="border border-[#E04A2F] rounded-2xl p-4 min-h-32 bg-white shadow-sm">
        {activeFeature === "adBlocker" && <AdBlocker isEnabled={featureToggles.adBlocker} onToggle={toggleFeature} />}
        {activeFeature === "productivityTracker" && <ProductivityTracker isEnabled={featureToggles.productivityTracker} onToggle={toggleFeature} />}
        {activeFeature === "notesManager" && <NotesManager />}
        {activeFeature === "tabManager" && <TabManager autoGroupEnabled={true} />}
      </motion.div>
    </motion.div>
  );
};

export default SidePanel;
