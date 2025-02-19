// adblocker-content.js

function blockAds() {
  // Default selectors to remove common ad elements
  const defaultSelectors = [
    "[id*='ad-']",
    "[class*='ad-']",
    "[class*='advert']",
    ".adsbygoogle",
    "iframe[src*='ads']"
  ];

  // Extra selectors used when the current domain matches a custom rule
  const extraSelectors = [
    "aside",
    ".sponsored",
    ".promo"
  ];

  const currentDomain = window.location.hostname;

  chrome.storage.local.get("customAdRules", (result) => {
    const customRules = result.customAdRules || [];
    // Check if current domain matches any custom rule (case-insensitive)
    const matchesCustomRule = customRules.some(rule =>
      currentDomain.toLowerCase().includes(rule.toLowerCase())
    );
    
    // Use extra selectors if there is a match
    const selectors = matchesCustomRule
      ? defaultSelectors.concat(extraSelectors)
      : defaultSelectors;
    
    let blockedCount = 0;
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((elem) => {
        elem.remove();
        blockedCount++;
      });
    });
    
    if (blockedCount > 0) {
      chrome.storage.local.get("blockedAds", (res) => {
        const count = (res.blockedAds || 0) + blockedCount;
        chrome.storage.local.set({ blockedAds: count });
      });
    }
  });
}

// Run the ad blocker only if enabled in settings
chrome.storage.local.get("featureToggles", (result) => {
  if (result.featureToggles && result.featureToggles.adBlocker) {
    blockAds();
  }
});
