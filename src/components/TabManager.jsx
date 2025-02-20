import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Trash,
  RotateCcw,
  Search,
  FolderPlus,
  PauseCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const TabManager = () => {
  const [savedSessions, setSavedSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabs, setTabs] = useState([]);
  const [snoozedTabs, setSnoozedTabs] = useState([]);
  const [selectedTabs, setSelectedTabs] = useState([]);
  const [autoGroupedTabs, setAutoGroupedTabs] = useState({});
  const [showSessionsDropdown, setShowSessionsDropdown] = useState(false);

  // Load saved sessions and snoozed tabs, and fetch open tabs
  useEffect(() => {
    chrome.storage.local.get(["savedSessions", "snoozedTabs"], (result) => {
      setSavedSessions(result.savedSessions || []);
      setSnoozedTabs(result.snoozedTabs || []);
    });

    chrome.tabs.query({}, (openTabs) => {
      setTabs(openTabs);
      autoGroupTabs(openTabs);
    });
  }, []);

  // Listen for tab removals
  useEffect(() => {
    const handleTabRemoved = (tabId) => {
      setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== tabId));
      setSelectedTabs((prevSelected) => prevSelected.filter((id) => id !== tabId));
    };
    chrome.tabs.onRemoved.addListener(handleTabRemoved);
    return () => {
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
    };
  }, []);

  // Listen for new tabs created manually
  useEffect(() => {
    const handleTabCreated = (tab) => {
      setTabs((prevTabs) => {
        const newTabs = [...prevTabs, tab];
        autoGroupTabs(newTabs);
        return newTabs;
      });
    };
    chrome.tabs.onCreated.addListener(handleTabCreated);
    return () => {
      chrome.tabs.onCreated.removeListener(handleTabCreated);
    };
  }, []);

  // Toggle checkbox selection
  const toggleTabSelection = (tabId) => {
    setSelectedTabs((prevSelected) =>
      prevSelected.includes(tabId)
        ? prevSelected.filter((id) => id !== tabId)
        : [...prevSelected, tabId]
    );
  };

  // Save selected tabs as a new session (auto-named by timestamp)
  const saveSelectedTabs = () => {
    if (selectedTabs.length === 0) return;

    Promise.all(
      selectedTabs.map(
        (tabId) =>
          new Promise((resolve) => {
            chrome.tabs.get(tabId, (tab) => {
              if (chrome.runtime.lastError || !tab) {
                resolve(null);
              } else {
                resolve({ title: tab.title || tab.url, url: tab.url });
              }
            });
          })
      )
    ).then((results) => {
      const tabDetails = results.filter((detail) => detail !== null);
      if (tabDetails.length === 0) return;
      const newSession = {
        id: Date.now(),
        createdAt: new Date().toLocaleString(),
        tabs: tabDetails,
      };
      const updatedSessions = [...savedSessions, newSession];
      setSavedSessions(updatedSessions);
      setSelectedTabs([]);
      chrome.storage.local.set({ savedSessions: updatedSessions });
    });
  };

  // Restore a saved session by opening all its tabs
  const restoreSession = (sessionId) => {
    const session = savedSessions.find((s) => s.id === sessionId);
    if (!session) return;
    session.tabs.forEach(({ url }) => {
      chrome.tabs.create({ url });
    });
  };

  // Delete a saved session
  const deleteSession = (sessionId) => {
    const updatedSessions = savedSessions.filter((s) => s.id !== sessionId);
    setSavedSessions(updatedSessions);
    chrome.storage.local.set({ savedSessions: updatedSessions });
  };

  // Snooze a tab and update local state
  const snoozeTab = (tab) => {
    const snoozedTabData = {
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title,
      url: tab.url,
    };
    chrome.tabs.remove(tab.id, () => {
      setSnoozedTabs((prev) => {
        const updated = [...prev, snoozedTabData];
        chrome.storage.local.set({ snoozedTabs: updated });
        return updated;
      });
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
    });
  };

  // Close a tab permanently
  const closeTab = (tabId) => {
    chrome.tabs.remove(tabId, () => {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
    });
  };

  // Restore all snoozed tabs
  const restoreSnoozedTabs = () => {
    snoozedTabs.forEach(({ url, windowId }) => {
      chrome.windows.get(windowId, (window) => {
        if (window) {
          chrome.tabs.create({ windowId, url });
        } else {
          chrome.tabs.create({ url });
        }
      });
    });
    setSnoozedTabs([]);
    chrome.storage.local.remove("snoozedTabs");
  };

  // Auto-group tabs based on keywords
  const autoGroupTabs = (openTabs) => {
    const categories = {
      "Social Media": ["facebook", "twitter", "instagram", "linkedin", "reddit"],
      Work: ["gmail", "slack", "notion", "zoom", "trello"],
      News: ["bbc", "cnn", "nytimes", "theguardian", "reuters"],
      Shopping: ["amazon", "ebay", "walmart", "flipkart", "aliexpress"],
      Entertainment: ["youtube", "netflix", "hulu", "spotify", "disney"],
    };
    const groupedTabs = {};
    openTabs.forEach((tab) => {
      for (const category in categories) {
        if (
          categories[category].some(
            (keyword) =>
              tab.url.toLowerCase().includes(keyword) ||
              tab.title.toLowerCase().includes(keyword)
          )
        ) {
          if (!groupedTabs[category]) {
            groupedTabs[category] = [];
          }
          groupedTabs[category].push({ id: tab.id, title: tab.title, url: tab.url });
          break;
        }
      }
    });
    setAutoGroupedTabs(groupedTabs);
  };

  // Filter tabs based on search query
  const filteredTabs = tabs.filter(
    (tab) =>
      tab.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.2 }}
      className="p-4 bg-white rounded-2xl"
    >
      {/* Heading */}
      <h2 className="text-xl font-bold text-[#E04A2F] mb-4">Tab Manager 🚀</h2>

      {/* Search Open Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search open tabs..."
          className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-[#E04A2F] focus:ring-[#E04A2F]"
        />
        <Search size={20} className="text-gray-500" />
      </div>

      {/* Save Selected Tabs as a Session */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={saveSelectedTabs}
          className="bg-[#E04A2F] text-white px-4 py-2 rounded-lg hover:bg-[#C13C25] transition-all flex items-center gap-2"
        >
          <FolderPlus size={16} /> Save Selection
        </button>
      </div>

      {/* Dropdown for Saved Sessions */}
      <div className="mb-4 relative">
        <button
          onClick={() => setShowSessionsDropdown(!showSessionsDropdown)}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-all flex items-center gap-2 w-full justify-between"
        >
          Saved Sessions
          {showSessionsDropdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSessionsDropdown && (
          <ul className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 z-10 max-h-60 overflow-y-auto">
            {savedSessions.length === 0 ? (
              <li className="p-2 text-sm text-gray-500">No sessions saved.</li>
            ) : (
              savedSessions.map((session) => (
                <li key={session.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                  <span className="text-sm">{session.createdAt}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreSession(session.id)}
                      className="text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    >
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Snoozed Tabs Section */}
      {snoozedTabs.length > 0 && (
        <div className="mt-4 p-2 bg-gray-100 rounded-lg flex justify-between items-center">
          <span className="text-sm font-medium">Snoozed Tabs: {snoozedTabs.length}</span>
          <button
            onClick={restoreSnoozedTabs}
            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <RotateCcw size={16} /> Restore All
          </button>
        </div>
      )}

      {/* List of Open Tabs */}
      <ul className="mt-4 max-h-40 overflow-y-auto border-t border-gray-200 pt-2">
        {filteredTabs.map((tab) => (
          <li key={tab.id} className="flex justify-between items-center p-2 border-b border-gray-200">
            <input
              type="checkbox"
              checked={selectedTabs.includes(tab.id)}
              onChange={() => toggleTabSelection(tab.id)}
              className="mr-2"
            />
            <span className="text-sm truncate w-3/4">{tab.title}</span>
            <div className="flex gap-2">
              <button
                onClick={() => snoozeTab(tab)}
                className="text-yellow-500 hover:text-yellow-700 flex items-center gap-1"
              >
                <PauseCircle size={16} /> Snooze
              </button>
              <button
                onClick={() => closeTab(tab.id)}
                className="text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <X size={16} /> Close
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Auto Grouped Tabs */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Auto Grouped Tabs</h3>
        {Object.keys(autoGroupedTabs).length > 0 ? (
          <ul className="max-h-40 overflow-y-auto border-t border-gray-200 pt-2">
            {Object.entries(autoGroupedTabs).map(([category, tabs]) => (
              <li key={category} className="mb-2">
                <h4 className="text-md font-medium text-blue-600">{category}</h4>
                <ul>
                  {tabs.map((tab) => (
                    <li key={tab.id} className="flex justify-between items-center p-2 border-b border-gray-200">
                      <span className="text-sm truncate w-3/4">{tab.title}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => chrome.tabs.create({ url: tab.url })}
                          className="text-green-500 hover:text-green-700 flex items-center gap-1"
                        >
                          <RotateCcw size={16} /> Open
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No tabs auto-grouped.</p>
        )}
      </div>
    </motion.div>
  );
};

export default TabManager;
