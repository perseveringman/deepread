import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { AVAILABLE_MODELS } from '@/services/openrouter';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { 
    apiKey, 
    model, 
    language, 
    isLoaded,
    loadSettings, 
    saveSettings 
  } = useSettingsStore();

  const [localApiKey, setLocalApiKey] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [localLanguage, setLocalLanguage] = useState<'zh' | 'en' | 'auto'>('auto');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 加载设置
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // 同步本地状态
  useEffect(() => {
    if (isLoaded) {
      setLocalApiKey(apiKey);
      setLocalModel(model);
      setLocalLanguage(language);
    }
  }, [isLoaded, apiKey, model, language]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await saveSettings({
        apiKey: localApiKey,
        model: localModel,
        language: localLanguage,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-4">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">设置</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          placeholder="sk-or-v1-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          从 <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">openrouter.ai/keys</a> 获取
        </p>
      </div>

      {/* 模型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          AI 模型
        </label>
        <select
          value={localModel}
          onChange={(e) => setLocalModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          {AVAILABLE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} - {m.description}
            </option>
          ))}
        </select>
      </div>

      {/* 语言选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          摘要语言
        </label>
        <select
          value={localLanguage}
          onChange={(e) => setLocalLanguage(e.target.value as 'zh' | 'en' | 'auto')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          <option value="auto">自动检测</option>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 成功信息 */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">设置已保存</p>
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          取消
        </button>
      </div>
    </div>
  );
}
