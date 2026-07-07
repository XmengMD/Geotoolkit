<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

// 主题选项
const themeOptions = [
  { value: 'dark', label: '深色主题' },
  { value: 'light', label: '浅色主题' },
  { value: 'system', label: '跟随系统' }
];

// 图表时间范围选项
const chartTimeRangeOptions = [
  { value: '30s', label: '30 秒' },
  { value: '1m', label: '1 分钟' },
  { value: '5m', label: '5 分钟' }
];

// 位置刷新间隔选项（毫秒，仅 Android 可通过 interval/minimumUpdateInterval 生效；iOS 由系统决定）
const refreshIntervalOptions = [
  { value: 500, label: '0.5 秒' },
  { value: 1000, label: '1 秒' },
  { value: 2000, label: '2 秒' },
  { value: 5000, label: '5 秒' },
  { value: 10000, label: '10 秒' }
];

// 模块选项
const moduleOptions = [
  { key: 'position', label: '位置', description: 'GPS位置和坐标显示' },
  { key: 'motion', label: '运动', description: '速度、方向和海拔信息' },
  { key: 'signal', label: '信号', description: 'GPS卫星和网络信号' },
  { key: 'sensor', label: '传感器', description: '加速度计、陀螺仪等' }
];

// 当前设置
const currentSettings = computed(() => settingsStore.settings);

// 主题切换
const handleThemeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setTheme(target.value as 'dark' | 'light' | 'system');
};

// 图表时间范围切换
const handleChartTimeRangeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setChartTimeRange(target.value as '30s' | '1m' | '5m');
};

// 刷新间隔切换
const handleRefreshIntervalChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setRefreshInterval(Number(target.value));
};

// 模块切换
const handleModuleToggle = (moduleKey: 'position' | 'motion' | 'signal' | 'sensor', enabled: boolean) => {
  settingsStore.setModuleEnabled(moduleKey, enabled);
};

// 重置设置
const handleResetSettings = () => {
  if (confirm('确定要重置所有设置为默认值吗？')) {
    settingsStore.resetSettings();
  }
};
</script>

<template>
  <div class="settings-view">
    <h1 class="page-title">设置</h1>

    <div class="settings-container">
      <!-- 主题设置 -->
      <section class="settings-section">
        <h2 class="section-title">外观</h2>
        <div class="settings-item">
          <label class="settings-label">主题模式</label>
          <select
            :value="currentSettings.theme"
            @change="handleThemeChange"
            class="settings-select"
          >
            <option
              v-for="option in themeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </section>

      <!-- 图表设置 -->
      <section class="settings-section">
        <h2 class="section-title">图表</h2>
        <div class="settings-item">
          <label class="settings-label">图表时间范围</label>
          <select
            :value="currentSettings.chartTimeRange"
            @change="handleChartTimeRangeChange"
            class="settings-select"
          >
            <option
              v-for="option in chartTimeRangeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </section>

      <!-- 位置刷新设置 -->
      <section class="settings-section">
        <h2 class="section-title">位置刷新</h2>
        <p class="section-description">设置 GPS 位置更新的期望间隔。该选项在 Android 上由 Capacitor Geolocation 直接控制；iOS 上由系统决定，设置仅供参考。</p>
        <div class="settings-item">
          <label class="settings-label">刷新间隔</label>
          <select
            :value="currentSettings.refreshInterval"
            @change="handleRefreshIntervalChange"
            class="settings-select"
          >
            <option
              v-for="option in refreshIntervalOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </section>

      <!-- 模块设置 -->
      <section class="settings-section">
        <h2 class="section-title">模块</h2>
        <p class="section-description">启用或禁用功能模块（影响底部导航栏显示）</p>
        <div class="module-list">
          <div
            v-for="module in moduleOptions"
            :key="module.key"
            class="module-item"
          >
            <div class="module-info">
              <div class="module-name">{{ module.label }}</div>
              <div class="module-description">{{ module.description }}</div>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="currentSettings.enabledModules[module.key as keyof typeof currentSettings.enabledModules]"
                @change="(e) => handleModuleToggle(module.key as 'position' | 'motion' | 'signal' | 'sensor', (e.target as HTMLInputElement).checked)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- 重置设置 -->
      <section class="settings-section">
        <button class="reset-button" @click="handleResetSettings">
          重置所有设置
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  background: var(--color-bg);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 500;
  padding: var(--spacing-lg);
  text-align: center;
  color: var(--color-text);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.settings-container {
  padding: var(--spacing-md);
  max-width: 800px;
  margin: 0 auto;
}

.settings-section {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.section-title {
  font-size: var(--font-size-lg);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.section-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--spacing-md);
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.settings-item:not(:last-child) {
  margin-bottom: var(--spacing-sm);
}

.settings-label {
  font-size: var(--font-size-md);
  color: var(--color-text);
  flex-shrink: 0;
  margin-right: var(--spacing-md);
}

.settings-select {
  width: auto;
  min-width: 180px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: var(--font-size-md);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.3s;
}

.settings-select:hover {
  border-color: var(--color-primary);
}

.settings-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(0, 188, 212, 0.2);
}

.module-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: 6px;
  border: 1px solid var(--color-border);
  transition: all 0.3s;
}

.module-item:hover {
  border-color: var(--color-primary);
}

.module-info {
  flex: 1;
  margin-right: var(--spacing-md);
}

.module-name {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.module-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: all 0.3s;
  border-radius: 28px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: all 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(22px);
}

.reset-button {
  width: 100%;
  padding: var(--spacing-md);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: all 0.3s;
}

.reset-button:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.reset-button:active {
  opacity: 0.8;
}

/* 响应式布局 */
@media (max-width: 600px) {
  .settings-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-label {
    margin-bottom: var(--spacing-xs);
    margin-right: 0;
  }

  .settings-select {
    width: 100%;
  }
}
</style>