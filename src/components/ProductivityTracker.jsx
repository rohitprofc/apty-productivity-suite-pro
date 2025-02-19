import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import ToggleSwitch from "./ToggleSwitch";
import { Settings, BarChart, Trash2 } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const ProductivityTracker = ({ isEnabled, onToggle }) => {
  const [activeTab, setActiveTab] = useState("analytics");
  const [siteUsage, setSiteUsage] = useState({});
  const [dailyLimit, setDailyLimit] = useState(0);
  const [newLimit, setNewLimit] = useState("");

  // Load usage and dailyLimit from storage
  useEffect(() => {
    chrome.storage.local.get(["siteUsage", "dailyLimit"], (res) => {
      setSiteUsage(res.siteUsage || {});
      setDailyLimit(res.dailyLimit || 0);
    });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.siteUsage) {
        setSiteUsage(changes.siteUsage.newValue);
      }
      if (changes.dailyLimit) {
        setDailyLimit(changes.dailyLimit.newValue);
      }
    });
  }, []);

  // Filter out invalid domains
  const filteredUsage = Object.entries(siteUsage).filter(
    ([domain]) => domain && domain !== "null"
  );

  // Define colors for the pie slices
  const defaultColors = [
    "rgba(224,74,47,0.8)",
    "rgba(60,179,113,0.8)",
    "rgba(65,105,225,0.8)",
    "rgba(238,130,238,0.8)",
    "rgba(255,165,0,0.8)",
    "rgba(70,130,180,0.8)",
  ];
  const backgroundColors = filteredUsage.map(
    (_, index) => defaultColors[index % defaultColors.length]
  );

  const chartData = {
    labels: filteredUsage.map(([domain]) => domain),
    datasets: [
      {
        data: filteredUsage.map(([_, time]) => time),
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map((color) =>
          color.replace("0.8", "1")
        ),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 20,
        },
      },
      title: {
        display: true,
        text: "Website Usage Distribution",
      },
    },
  };

  // Sum total usage
  const totalUsageSeconds = filteredUsage.reduce(
    (sum, [_, time]) => sum + time,
    0
  );

  // Save new daily limit
  const saveLimit = () => {
    if (!newLimit) return;
    const val = parseInt(newLimit, 10);
    if (!isNaN(val)) {
      chrome.storage.local.set({ dailyLimit: val }, () => {
        setDailyLimit(val);
        setNewLimit("");
      });
    }
  };

  // Reset usage
  const resetUsage = () => {
    chrome.storage.local.set({ siteUsage: {} }, () => {
      setSiteUsage({});
    });
  };

  return (
    <div>
      {/* Enable/Disable Switch */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-lg font-medium">
          {isEnabled
            ? "Productivity Tracker is Enabled"
            : "Productivity Tracker is Disabled"}
        </span>
        <ToggleSwitch
          isChecked={isEnabled}
          onChange={() => onToggle("productivityTracker")}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mt-4">
        <motion.button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "analytics"
              ? "bg-[#E04A2F] text-white"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab("analytics")}
        >
          <BarChart size={16} /> Analytics
        </motion.button>

        <motion.button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === "settings"
              ? "bg-[#E04A2F] text-white"
              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={16} /> Settings
        </motion.button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
        className="border border-[#E04A2F] rounded-2xl p-4 mt-4 bg-white shadow-sm min-h-[200px]"
      >
        {activeTab === "analytics" ? (
          <div>
            <h3 className="text-md font-semibold mb-2">Website Usage</h3>
            {filteredUsage.length === 0 ? (
              <p className="text-gray-400 text-center italic">
                No tracking data yet...
              </p>
            ) : (
              <Pie data={chartData} options={options} />
            )}

            <div className="mt-4 text-sm">
              <span className="font-bold">Total usage so far:</span>{" "}
              {totalUsageSeconds} seconds
              <br />
              {dailyLimit > 0 && (
                <>
                  <span className="font-bold">Daily limit:</span>{" "}
                  {dailyLimit} seconds
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-md font-semibold mb-2">
              Daily Limit (seconds)
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                className="p-2 border border-gray-300 rounded-lg focus:outline-none w-1/2"
                placeholder="3600 for 1 hour"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
              />
              <button
                onClick={saveLimit}
                className="bg-[#E04A2F] text-white px-3 py-2 rounded-lg hover:bg-[#C13C25] transition-all"
              >
                Set Limit
              </button>
            </div>

            <div className="flex gap-2 items-center mb-4">
              <span className="text-sm font-bold">Current Limit:</span>
              <span className="text-sm">
                {dailyLimit > 0 ? `${dailyLimit} seconds` : "No limit set"}
              </span>
            </div>

            <button
              onClick={resetUsage}
              className="inline-flex items-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all"
            >
              <Trash2 size={16} />
              Reset All Usage
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProductivityTracker;
