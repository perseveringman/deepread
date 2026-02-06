// DeepRead Content Script
console.log('DeepRead content script loaded');

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_CONTENT') {
    const content = {
      url: window.location.href,
      title: document.title,
      html: document.documentElement.outerHTML,
    };
    sendResponse(content);
  }
  return false;
});

export {};
