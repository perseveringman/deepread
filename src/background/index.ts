// DeepRead Background Service Worker
import type { ExtractContentResponse } from '@/types/messages';

console.log('DeepRead background service worker loaded');

// Handle side panel opening
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 处理快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  
  // 获取当前窗口
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.windowId) return;
  
  if (command === 'extract-article' || command === 'generate-summary') {
    // 确保侧边栏已打开
    await chrome.sidePanel.open({ windowId: tab.windowId });
    
    // 延迟一下确保侧边栏加载完成
    setTimeout(() => {
      // 发送命令给侧边栏
      chrome.runtime.sendMessage({ 
        type: 'COMMAND', 
        command: command 
      }).catch(() => {
        // 侧边栏可能还没准备好接收消息，忽略错误
      });
    }, 300);
  }
});

// OpenRouter API 代理
async function proxyOpenRouterRequest(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; max_tokens?: number }
): Promise<{ success: true; data: unknown } | { success: false; error: string; code?: string; status?: number }> {
  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  
  try {
    console.log('Proxying OpenRouter request:', { model, messageCount: messages.length });
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://deepread.app',
        'X-Title': 'DeepRead',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorCode = 'unknown';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        errorCode = errorData.error?.code || errorCode;
      } catch {
        // ignore json parse error
      }
      
      console.error('OpenRouter API error:', { status: response.status, message: errorMessage });
      return { success: false, error: errorMessage, code: errorCode, status: response.status };
    }

    const data = await response.json();
    console.log('OpenRouter response received');
    return { success: true, data };
  } catch (error) {
    console.error('OpenRouter fetch error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '网络请求失败',
      code: 'network_error',
      status: 0
    };
  }
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
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
  
  // OpenRouter API 代理请求
  if (message.type === 'OPENROUTER_REQUEST') {
    const { apiKey, model, messages, options } = message;
    
    proxyOpenRouterRequest(apiKey, model, messages, options)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : '未知错误' 
        });
      });
    
    return true; // Keep channel open for async response
  }
  
  return false;
});

export {};
