import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useArticleStore } from '@/store/articleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useI18n } from '@/i18n';

export interface ChatHandle {
  setInput: (text: string) => void;
}

export const Chat = forwardRef<ChatHandle>(function Chat(_props, ref) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    content,
    chatMessages,
    chatLoading,
    chatError,
    sendMessage,
    clearChat,
  } = useArticleStore();

  const { apiKey, model, language } = useSettingsStore();

  // 暴露 setInput 方法给父组件
  useImperativeHandle(ref, () => ({
    setInput: (text: string) => {
      setInput(text);
      inputRef.current?.focus();
    },
  }));

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (!input.trim() || chatLoading) return;
    sendMessage(apiKey, model, input.trim(), language);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 建议问题
  const suggestedQuestions = [
    t.chat.questions.mainArgument,
    t.chat.questions.evidence,
    t.chat.questions.application,
    t.chat.questions.critique,
  ];

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">{t.chat.extractFirst}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {chatMessages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center py-4">
              {t.chat.emptyState}
            </p>
            
            {/* 建议问题 */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400">{t.chat.suggestedQuestions}</p>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* 加载中 */}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 错误提示 */}
      {chatError && (
        <div className="px-3 py-2 mb-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{chatError}</p>
        </div>
      )}

      {/* 清除对话按钮 */}
      {chatMessages.length > 0 && (
        <div className="flex justify-center mb-2">
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {t.chat.clearChat}
          </button>
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chat.placeholder}
          disabled={chatLoading || !apiKey}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={chatLoading || !input.trim() || !apiKey}
          className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* API Key 提示 */}
      {!apiKey && (
        <p className="text-xs text-gray-400 text-center mt-2">
          {t.chat.apiKeyRequired}
        </p>
      )}
    </div>
  );
});
