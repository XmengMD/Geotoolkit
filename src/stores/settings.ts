import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { AppSettings, ChartTimeRange } from '@/types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  chartTimeRange: '1m',
  refreshInterval: 1000,
  coordinateFormat: 'dd',
  speedUnit: 'kmh',
  distanceUnit: 'm',
  accelerationUnit: 'ms2',
  enabledModules: {
    position: true,
    motion: true,
    signal: false,
    sensor: false
  }
};

export const useSettingsStore = defineStore('settings', () => {
  // 从localStorage加载设置
  const loadSettings = (): AppSettings => {
    try {
      const saved = localStorage.getItem('geoToolkit_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
    return DEFAULT_SETTINGS;
  };

  const settings = ref<AppSettings>(loadSettings());

  // 保存设置到localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('geoToolkit_settings', JSON.stringify(settings.value));
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  };

  // 监听设置变化并自动保存
  watch(settings, saveSettings, { deep: true });

  // 更新设置
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
  };

  // 更新主题
  const setTheme = (theme: 'dark' | 'light' | 'system') => {
    settings.value.theme = theme;
    applyTheme(theme);
  };

  // 应用主题
  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  };

  // 设置图表时间范围
  const setChartTimeRange = (range: ChartTimeRange) => {
    settings.value.chartTimeRange = range;
  };

  // 设置坐标格式
  const setCoordinateFormat = (format: 'dd' | 'dms' | 'utm' | 'mgrs' | 'pluscode') => {
    settings.value.coordinateFormat = format;
  };

  // 设置速度单位
  const setSpeedUnit = (unit: 'ms' | 'kmh' | 'mph' | 'knots') => {
    settings.value.speedUnit = unit;
  };

  // 设置距离单位
  const setDistanceUnit = (unit: 'm' | 'ft') => {
    settings.value.distanceUnit = unit;
  };

  // 设置加速度单位
  const setAccelerationUnit = (unit: 'ms2' | 'g') => {
    settings.value.accelerationUnit = unit;
  };

  // 设置刷新间隔（毫秒）
  const setRefreshInterval = (interval: number) => {
    settings.value.refreshInterval = interval;
  };

  // 更新模块启用状态
  const setModuleEnabled = (module: keyof AppSettings['enabledModules'], enabled: boolean) => {
    settings.value.enabledModules[module] = enabled;
  };

  // 重置设置
  const resetSettings = () => {
    settings.value = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    // 立即保存并重新应用主题
    saveSettings();
    applyTheme(settings.value.theme);
  };

  // 初始化时应用主题
  applyTheme(settings.value.theme);

  return {
    settings,
    updateSettings,
    setTheme,
    setChartTimeRange,
    setCoordinateFormat,
    setSpeedUnit,
    setDistanceUnit,
    setAccelerationUnit,
    setRefreshInterval,
    setModuleEnabled,
    resetSettings
  };
});