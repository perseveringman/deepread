/**
 * i18n Hook
 */

import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { translations, type TranslationKeys } from './translations';
import type { UILanguage } from '@/types';

/**
 * 获取系统语言
 */
function getSystemLanguage(): 'zh' | 'en' {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

/**
 * 解析 UI 语言设置
 */
function resolveLanguage(uiLanguage: UILanguage): 'zh' | 'en' {
  if (uiLanguage === 'system') {
    return getSystemLanguage();
  }
  return uiLanguage;
}

/**
 * i18n Hook
 */
export function useI18n() {
  const { uiLanguage } = useSettingsStore();
  
  const lang = useMemo(() => resolveLanguage(uiLanguage), [uiLanguage]);
  
  const t = useMemo(() => translations[lang], [lang]);
  
  return {
    lang,
    t,
    // 便捷方法：替换占位符
    format: (template: string, values: Record<string, string | number>) => {
      return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
    },
  };
}

export { translations, type UILanguage, type TranslationKeys };
