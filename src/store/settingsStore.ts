import { create } from 'zustand';
import type { Settings } from '@/types';

interface SettingsState extends Settings {
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
  clearApiKey: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'openrouter',
  apiKey: '',
  model: 'openai/gpt-4o-mini',
  defaultReadingLevel: 'core',
  language: 'auto',
  uiLanguage: 'system',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const result = await chrome.storage.sync.get('settings');
      const savedSettings = result.settings as Partial<Settings> | undefined;
      
      if (savedSettings) {
        set({ ...DEFAULT_SETTINGS, ...savedSettings, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoaded: true });
    }
  },

  saveSettings: async (newSettings: Partial<Settings>) => {
    const currentState = get();
    const updatedSettings: Settings = {
      provider: newSettings.provider ?? currentState.provider,
      apiKey: newSettings.apiKey ?? currentState.apiKey,
      model: newSettings.model ?? currentState.model,
      defaultReadingLevel: newSettings.defaultReadingLevel ?? currentState.defaultReadingLevel,
      language: newSettings.language ?? currentState.language,
      uiLanguage: newSettings.uiLanguage ?? currentState.uiLanguage,
    };

    try {
      await chrome.storage.sync.set({ settings: updatedSettings });
      set(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('保存设置失败');
    }
  },

  clearApiKey: async () => {
    const currentState = get();
    const updatedSettings: Settings = {
      ...currentState,
      apiKey: '',
    };

    try {
      await chrome.storage.sync.set({ settings: updatedSettings });
      set({ apiKey: '' });
    } catch (error) {
      console.error('Failed to clear API key:', error);
      throw new Error('清除 API Key 失败');
    }
  },
}));
