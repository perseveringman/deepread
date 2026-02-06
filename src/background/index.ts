// DeepRead Background Service Worker
console.log('DeepRead background service worker loaded');

// Handle side panel opening
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'EXTRACT_CONTENT') {
    // Forward to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CONTENT' }, sendResponse);
      }
    });
    return true; // Keep channel open for async response
  }
  
  return false;
});

export {};
