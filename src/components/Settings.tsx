import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { AVAILABLE_MODELS } from '@/services/openrouter';
import { useI18n } from '@/i18n';
import type { UILanguage } from '@/types';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { t } = useI18n();
  const { 
    apiKey, 
    model, 
    language,
    uiLanguage,
    isLoaded,
    loadSettings, 
    saveSettings 
  } = useSettingsStore();

  const [localApiKey, setLocalApiKey] = useState('');
  const [localModel, setLocalModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [localLanguage, setLocalLanguage] = useState<'zh' | 'en' | 'auto'>('auto');
  const [localUiLanguage, setLocalUiLanguage] = useState<UILanguage>('system');
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
      setLocalLanguage(language);
      setLocalUiLanguage(uiLanguage);
      
      // 检查是否是预设模型
      const isPreset = AVAILABLE_MODELS.some(m => m.id === model);
      if (isPreset) {
        setLocalModel(model);
        setUseCustomModel(false);
        setCustomModel('');
      } else {
        setLocalModel(AVAILABLE_MODELS[0].id);
        setUseCustomModel(true);
        setCustomModel(model);
      }
    }
  }, [isLoaded, apiKey, model, language, uiLanguage]);

  const handleSave = async () => {
    const finalModel = useCustomModel ? customModel.trim() : localModel;
    
    if (!finalModel) {
      setError(t.settings.saveFailed);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await saveSettings({
        apiKey: localApiKey,
        model: finalModel,
        language: localLanguage,
        uiLanguage: localUiLanguage,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.settings.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-4">
        <p className="text-gray-500">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.settings.title}</h2>
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
          {t.settings.apiKey}
        </label>
        <input
          type="password"
          value={localApiKey}
          onChange={(e) => setLocalApiKey(e.target.value)}
          placeholder={t.settings.apiKeyPlaceholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          {t.settings.apiKeyHelp.split('openrouter.ai/keys')[0]}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">openrouter.ai/keys</a>
          {t.settings.apiKeyHelp.split('openrouter.ai/keys')[1] || ''}
        </p>
      </div>

      {/* 模型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.settings.model}
        </label>
        
        {/* 切换按钮 */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setUseCustomModel(false)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              !useCustomModel 
                ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {t.settings.presetModels}
          </button>
          <button
            type="button"
            onClick={() => setUseCustomModel(true)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              useCustomModel 
                ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            {t.settings.customModel}
          </button>
        </div>
        
        {!useCustomModel ? (
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
        ) : (
          <div>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder={t.settings.customModelPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t.settings.customModelHelp.split('openrouter.ai/models')[0]}
              <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">openrouter.ai/models</a>
              {t.settings.customModelHelp.split('openrouter.ai/models')[1] || ''}
            </p>
          </div>
        )}
      </div>

      {/* 摘要语言选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.settings.summaryLanguage}
        </label>
        <select
          value={localLanguage}
          onChange={(e) => setLocalLanguage(e.target.value as 'zh' | 'en' | 'auto')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          <option value="auto">{t.settings.languageOptions.auto}</option>
          <option value="zh">{t.settings.languageOptions.zh}</option>
          <option value="en">{t.settings.languageOptions.en}</option>
        </select>
      </div>

      {/* UI 语言选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t.settings.uiLanguage}
        </label>
        <select
          value={localUiLanguage}
          onChange={(e) => setLocalUiLanguage(e.target.value as UILanguage)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        >
          <option value="system">{t.settings.languageOptions.system}</option>
          <option value="zh">{t.settings.languageOptions.zh}</option>
          <option value="en">{t.settings.languageOptions.en}</option>
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
          <p className="text-sm text-green-600">{t.settings.saveSuccess}</p>
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1"
        >
          {saving ? t.settings.saving : t.settings.saveSettings}
        </button>
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
