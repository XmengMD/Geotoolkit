<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onDeactivated, watch } from 'vue';
import { usePosition } from '@/composables/usePosition';
import { useSettingsStore } from '@/stores/settings';
import { useModuleLifecycleStore } from '@/stores/moduleLifecycle';
import { convertDistance, getDistanceUnitLabel } from '@/utils/coordinates';

const settingsStore = useSettingsStore();
const lifecycleStore = useModuleLifecycleStore();
const {
  position,
  coordinates,
  error,
  isLoading,
  isActive,
  startWatching,
  stopWatching,
  getCurrentPosition
} = usePosition();

// 注册模块生命周期
onMounted(() => {
  lifecycleStore.registerModule('position', {
    start: startWatching,
    stop: stopWatching,
    get isActive() { return isActive.value; }
  });

  // 每秒更新一次“数据年龄”
  ageTimer = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (ageTimer) {
    clearInterval(ageTimer);
    ageTimer = null;
  }
});

onDeactivated(() => {
  lifecycleStore.unregisterModule('position');
});

// 当前选中的坐标格式标签
const activeFormatTab = ref<'dd' | 'dms' | 'utm' | 'mgrs'>('dd');

// 距离单位选项
const distanceUnitOptions = [
  { value: 'm', label: '米' },
  { value: 'ft', label: '英尺' }
];

// 切换监听状态
const toggleWatching = async () => {
  if (isActive.value) {
    await stopWatching();
  } else {
    await startWatching();
  }
};

// 获取单次位置
const getOnce = async () => {
  if (isActive.value) {
    await stopWatching();
  }
  await getCurrentPosition();
};

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 数据年龄（秒）
const currentTime = ref(Date.now());
let ageTimer: ReturnType<typeof setInterval> | null = null;

const dataAge = computed(() => {
  if (!position.value) return null;
  return Math.max(0, Math.floor((currentTime.value - position.value.timestamp) / 1000));
});

const formatDataAge = (seconds: number | null): string => {
  if (seconds === null) return '--';
  if (seconds < 1) return '刚刚';
  return `${seconds} 秒前`;
};

// 距离单位标签
const distanceUnitLabel = computed(() => getDistanceUnitLabel(settingsStore.settings.distanceUnit));

// 格式化海拔值
const formatAltitude = (altitude: number | null): string => {
  if (altitude === null) return '--';
  return convertDistance(altitude, settingsStore.settings.distanceUnit).toFixed(1);
};

// 格式化精度值
const formatAccuracy = (accuracy: number | null): string => {
  if (accuracy === null) return '--';
  return convertDistance(accuracy, settingsStore.settings.distanceUnit).toFixed(1);
};

// 切换距离单位
const handleDistanceUnitChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setDistanceUnit(target.value as 'm' | 'ft');
};

// 格式化方向值
const formatHeading = (heading: number | null): string => {
  if (heading === null) return '--';
  return heading.toFixed(0);
};

// 获取方向描述
const getHeadingDirection = (heading: number | null): string => {
  if (heading === null) return '';
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
};



// 监听主题变化，确保深色主题
watch(
  () => settingsStore.settings.theme,
  (theme) => {
    // 主题由 App.vue 处理，这里只是确保
  },
  { immediate: true }
);
</script>

<template>
  <div class="position-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">位置信息</h1>
      <div class="status-bar">
        <span class="status-indicator" :class="{ active: isActive }"></span>
        <span class="status-text">{{ isActive ? '监听中' : '已停止' }}</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message card">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- 控制按钮 -->
    <div class="control-buttons">
      <button
        class="control-btn"
        :class="{ active: isActive }"
        @click="toggleWatching"
        :disabled="isLoading"
      >
        <span v-if="isLoading">加载中...</span>
        <span v-else-if="isActive">停止监听</span>
        <span v-else>开始监听</span>
      </button>
      <button
        class="control-btn secondary"
        @click="getOnce"
        :disabled="isLoading || isActive"
      >
        获取单次位置
      </button>
    </div>

    <!-- 单位设置 -->
    <div class="unit-settings">
      <div class="unit-setting-item">
        <label class="unit-setting-label">距离单位</label>
        <select
          :value="settingsStore.settings.distanceUnit"
          @change="handleDistanceUnitChange"
          class="unit-setting-select"
        >
          <option
            v-for="option in distanceUnitOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 主要数据展示 -->
    <div v-if="position" class="main-data">
      <!-- DD 格式 -->
      <div v-if="activeFormatTab === 'dd'" class="coordinate-section">
        <div class="card coordinate-card">
          <div class="card-title">纬度 (DD)</div>
          <div class="data-value dd-value">{{ coordinates?.dd.latitude || '--' }}</div>
          <div class="data-label">十进制度数</div>
        </div>
        <div class="card coordinate-card">
          <div class="card-title">经度 (DD)</div>
          <div class="data-value dd-value">{{ coordinates?.dd.longitude || '--' }}</div>
          <div class="data-label">十进制度数</div>
        </div>
      </div>

      <!-- DMS 格式 -->
      <div v-if="activeFormatTab === 'dms'" class="coordinate-section">
        <div class="card coordinate-card">
          <div class="card-title">纬度 (DMS)</div>
          <div class="data-value dms-value">{{ coordinates?.dms.latitude || '--' }}</div>
          <div class="data-label">度分秒格式</div>
        </div>
        <div class="card coordinate-card">
          <div class="card-title">经度 (DMS)</div>
          <div class="data-value dms-value">{{ coordinates?.dms.longitude || '--' }}</div>
          <div class="data-label">度分秒格式</div>
        </div>
      </div>

      <!-- UTM 格式 -->
      <div v-if="activeFormatTab === 'utm'" class="coordinate-section utm-section">
        <div class="card coordinate-card full-width">
          <div class="card-title">UTM 坐标</div>
          <div class="utm-data">
            <div class="utm-item">
              <span class="utm-label">分区:</span>
              <span class="utm-value">{{ coordinates?.utm.zone || '--' }}</span>
            </div>
            <div class="utm-item">
              <span class="utm-label">东向:</span>
              <span class="utm-value">{{ coordinates?.utm.easting || '--' }} m</span>
            </div>
            <div class="utm-item">
              <span class="utm-label">北向:</span>
              <span class="utm-value">{{ coordinates?.utm.northing || '--' }} m</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MGRS 格式 -->
      <div v-if="activeFormatTab === 'mgrs'" class="coordinate-section">
        <div class="card coordinate-card full-width">
          <div class="card-title">MGRS 坐标</div>
          <div class="data-value mgrs-value">{{ coordinates?.mgrs || '--' }}</div>
          <div class="data-label">军事网格参考系统</div>
        </div>
      </div>

      <!-- 格式切换标签 -->
      <div class="format-tabs card">
        <button
          v-for="tab in ['dd', 'dms', 'utm', 'mgrs']"
          :key="tab"
          class="format-tab"
          :class="{ active: activeFormatTab === tab }"
          @click="activeFormatTab = tab as any"
        >
          {{ tab.toUpperCase() }}
        </button>
      </div>

      <!-- 详细信息卡片 -->
      <div class="info-cards">
        <!-- 海拔 -->
        <div class="card info-card">
          <div class="card-title">海拔</div>
          <div class="data-value">
            {{ formatAltitude(position.altitude) }}
            <span class="data-unit">{{ distanceUnitLabel }}</span>
          </div>
          <div class="data-label">高度</div>
        </div>

        <!-- 精度 -->
        <div class="card info-card">
          <div class="card-title">精度</div>
          <div class="data-value">
            {{ formatAccuracy(position.accuracy) }}
            <span class="data-unit">{{ distanceUnitLabel }}</span>
          </div>
          <div class="data-label">水平精度</div>
        </div>

        <!-- 海拔精度 -->
        <div class="card info-card">
          <div class="card-title">海拔精度</div>
          <div class="data-value">
            {{ formatAccuracy(position.altitudeAccuracy) }}
            <span class="data-unit">{{ distanceUnitLabel }}</span>
          </div>
          <div class="data-label">垂直精度</div>
        </div>

        <!-- 方向 -->
        <div class="card info-card">
          <div class="card-title">方向</div>
          <div class="data-value">
            {{ formatHeading(position.heading) }}
            <span class="data-unit">°</span>
          </div>
          <div class="data-label">{{ getHeadingDirection(position.heading) }}</div>
        </div>

        <!-- 更新时间 -->
        <div class="card info-card">
          <div class="card-title">更新时间</div>
          <div class="timestamp-value">{{ formatTimestamp(position.timestamp) }}</div>
          <div class="data-label">{{ formatDataAge(dataAge) }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state card">
      <div class="empty-icon">📍</div>
      <div class="empty-text">点击"开始监听"获取位置信息</div>
    </div>
  </div>
</template>

<style scoped>
.position-view {
  height: 100%;
  overflow-y: auto;
  background: var(--color-bg);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 500;
  color: var(--color-text);
  margin: 0;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: background 0.3s;
}

.status-indicator.active {
  background: var(--color-success);
  box-shadow: 0 0 8px var(--color-success);
}

.status-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  background: rgba(244, 67, 54, 0.1);
  border-color: var(--color-error);
  margin: var(--spacing-md);
}

.error-icon {
  font-size: var(--font-size-xl);
}

.error-text {
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.control-buttons {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.unit-settings {
  display: flex;
  gap: var(--spacing-md);
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.unit-setting-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.unit-setting-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.unit-setting-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
}

.unit-setting-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.control-btn {
  flex: 1;
  padding: var(--spacing-md);
  font-size: var(--font-size-md);
  font-weight: 500;
  transition: all 0.3s;
}

.control-btn.active {
  background: var(--color-error);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-data {
  padding: var(--spacing-md);
}

.coordinate-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.coordinate-section.utm-section {
  grid-template-columns: 1fr;
}

.coordinate-card {
  padding: var(--spacing-lg);
}

.coordinate-card.full-width {
  grid-column: 1 / -1;
}

.dd-value {
  font-size: var(--font-size-lg);
  word-break: break-all;
}

.dms-value {
  font-size: var(--font-size-lg);
  word-break: break-all;
}

.mgrs-value {
  font-size: var(--font-size-xl);
  word-break: break-all;
  text-align: center;
}

.utm-data {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.utm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.utm-item:last-child {
  border-bottom: none;
}

.utm-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.utm-value {
  font-size: var(--font-size-lg);
  font-weight: 500;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
}

.format-tabs {
  display: flex;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.format-tab {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: all 0.3s;
}

.format-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.format-tab:hover:not(.active) {
  background: var(--color-bg-secondary);
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.info-card {
  padding: var(--spacing-md);
}

.timestamp-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-family-mono);
  line-height: 1.4;
  margin-top: var(--spacing-sm);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  margin: var(--spacing-xl);
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--spacing-md);
}

.empty-text {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

/* 响应式布局 */
@media (max-width: 400px) {
  .coordinate-section {
    grid-template-columns: 1fr;
  }

  .info-cards {
    grid-template-columns: 1fr;
  }

  .control-buttons {
    flex-direction: column;
  }
}
</style>