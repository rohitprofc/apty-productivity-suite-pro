chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

let activeTabId = null;
let activeDomain = null;
let startTime = null;

// Only set defaults if not already set
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["siteUsage", "dailyLimit"], (result) => {
    if (!result.siteUsage) {
      chrome.storage.local.set({ siteUsage: {} });
    }
    if (!result.dailyLimit) {
      chrome.storage.local.set({ dailyLimit: 3600 }); // default to 1 hour
    }
    // Note: We don't touch "tabGroups" here to avoid overwriting saved groups.
  });
});

// Listen for any storage changes (for debugging)
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log("Storage change in", areaName, changes);
});

// When tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTracking();
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      activeTabId = tab.id;
      activeDomain = extractDomain(tab.url);
      startTime = Date.now();
    }
  });
});

// When active tab's URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    updateTracking(); // finalize tracking for old domain
    activeDomain = extractDomain(changeInfo.url);
    startTime = Date.now();
  }
});

// When user leaves Chrome (window loses focus)
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    updateTracking();
    activeTabId = null;
    activeDomain = null;
    startTime = null;
  }
});

function extractDomain(url) {
  try {
    let domain = new URL(url).hostname.replace("www.", "");
    return domain && domain !== "" ? domain : null;
  } catch (error) {
    return null;
  }
}

function updateTracking() {
  if (activeDomain && startTime) {
    let elapsedTime = Math.floor((Date.now() - startTime) / 1000);

    chrome.storage.local.get(["siteUsage", "dailyLimit", "featureToggles"], (res) => {
      let usage = res.siteUsage || {};
      let dailyLimit = res.dailyLimit || 0;
      let toggles = res.featureToggles || {};

      // If the user turned Productivity Tracker OFF, skip counting
      if (!toggles.productivityTracker) return;

      // Accumulate domain usage
      usage[activeDomain] = (usage[activeDomain] || 0) + elapsedTime;
      chrome.storage.local.set({ siteUsage: usage });

      // Compare total usage to daily limit
      let totalSeconds = Object.values(usage).reduce((a, b) => a + b, 0);
      if (dailyLimit > 0 && totalSeconds >= dailyLimit) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("logo.png"),
          title: "Daily Limit Reached",
          message: `You've exceeded your daily limit of ${dailyLimit}s! Time to take a break.`,
          priority: 2
        });
      }
    });
  }
}
