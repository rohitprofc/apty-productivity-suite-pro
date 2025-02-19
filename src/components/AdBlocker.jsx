import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";

const AdBlocker = ({ isEnabled, onToggle }) => {
  const [blockedAds, setBlockedAds] = useState(0);
  const [isAdBlockerEnabled, setIsAdBlockerEnabled] = useState(isEnabled);
  const [showSettings, setShowSettings] = useState(false);
  const [customRules, setCustomRules] = useState([]);
  const [newRule, setNewRule] = useState("");

  useEffect(() => {
    chrome.storage.local.get(
      ["blockedAds", "featureToggles", "customAdRules"],
      (result) => {
        setBlockedAds(result.blockedAds || 0);
        setIsAdBlockerEnabled(result.featureToggles?.adBlocker || false);
        setCustomRules(result.customAdRules || []);
      }
    );

    const listener = (changes) => {
      if (changes.blockedAds) {
        setBlockedAds(changes.blockedAds.newValue);
      }
      if (changes.featureToggles && changes.featureToggles.newValue) {
        setIsAdBlockerEnabled(changes.featureToggles.newValue.adBlocker);
      }
      if (changes.customAdRules && changes.customAdRules.newValue) {
        setCustomRules(changes.customAdRules.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const addCustomRule = () => {
    if (!newRule.trim()) return;
    const updatedRules = [...customRules, newRule.trim()];
    chrome.storage.local.set({ customAdRules: updatedRules }, () => {
      setCustomRules(updatedRules);
      setNewRule("");
    });
  };

  const removeCustomRule = (ruleToRemove) => {
    const updatedRules = customRules.filter((rule) => rule !== ruleToRemove);
    chrome.storage.local.set({ customAdRules: updatedRules }, () => {
      setCustomRules(updatedRules);
    });
  };

  const resetBlockedAdsCount = () => {
    chrome.storage.local.set({ blockedAds: 0 }, () => {
      setBlockedAds(0);
    });
  };

  return (
    <div>
      {/* Enable/Disable Ad Blocker */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-lg font-medium">
          {isAdBlockerEnabled ? "Ad Blocker is Enabled" : "Ad Blocker is Disabled"}
        </span>
        <ToggleSwitch
          isChecked={isAdBlockerEnabled}
          onChange={() => {
            onToggle("adBlocker");
            setIsAdBlockerEnabled(!isAdBlockerEnabled);
          }}
        />
      </div>

      {/* Blocked Ads Count */}
      <div className="flex justify-between items-center mt-3 p-3 bg-gray-100 rounded-xl shadow-sm">
        <span className="text-sm font-medium">Blocked Ads:</span>
        <span className="text-sm font-bold text-[#E04A2F]">{blockedAds}</span>
        <button onClick={resetBlockedAdsCount} className="ml-4 text-xs text-blue-500 hover:underline">
          Reset Count
        </button>
      </div>

      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 mt-4 p-2 w-full bg-[#E04A2F] text-white font-medium rounded-lg hover:bg-[#C13C25] transition-all"
      >
        <Settings size={16} />
        {showSettings ? "Hide Settings" : "Ad Blocker Settings"}
      </motion.button>

      {/* Ad Blocker Settings */}
      {showSettings && (
        <div className="mt-4 p-4 border border-gray-300 rounded-lg">
          <h3 className="text-lg font-bold mb-3">Custom Domain Rules</h3>
          <div className="flex mb-3">
            <input
              type="text"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none"
            />
            <button
              onClick={addCustomRule}
              className="bg-[#E04A2F] text-white px-4 py-2 rounded-r-lg hover:bg-[#C13C25] transition-all"
            >
              Add Rule
            </button>
          </div>
          {customRules.length > 0 ? (
            <ul className="mb-3">
              {customRules.map((rule, index) => (
                <li key={index} className="flex justify-between items-center p-2 border-b border-gray-200">
                  <span className="text-sm">{rule}</span>
                  <button onClick={() => removeCustomRule(rule)} className="text-red-500 hover:text-red-700">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No custom rules added.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdBlocker;
