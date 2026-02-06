// DeepRead Background Service Worker
import type { ExtractContentResponse } from '@/types/messages';

console.log('DeepRead background service worker loaded');

// Handle side panel opening
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message);
  
  if (message.type === 'EXTRACT_CONTENT') {
    // Forward to content script of active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        const errorResponse: ExtractContentResponse = {
          type: 'EXTRACTION_ERROR',
          error: '无法获取当前标签页',
        };
        sendResponse(errorResponse);
        return;
      }
      
      chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' }, (response) => {
        if (chrome.runtime.lastError) {
          const errorResponse: ExtractContentResponse = {
            type: 'EXTRACTION_ERROR',
            error: chrome.runtime.lastError.message || '无法与页面通信',
          };
          sendResponse(errorResponse);
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep channel open for async response
  }
  
  return false;
});

export {};
