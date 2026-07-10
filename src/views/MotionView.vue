<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import * as echarts from 'echarts';
import { useMotion } from '@/composables/useMotion';
import { useSettingsStore } from '@/stores/settings';
import { useModuleLifecycleStore } from '@/stores/moduleLifecycle';
import {
  convertSpeed,
  convertAcceleration,
  getSpeedUnitLabel,
  getAccelerationUnitLabel
} from '@/utils/coordinates';
import type { ChartDataPoint } from '@/types';

const settingsStore = useSettingsStore();
const lifecycleStore = useModuleLifecycleStore();
const {
  motionData,
  speedHistory,
  altitudeHistory,
  accelerationHistory,
  error,
  isActive,
  startWatching,
  stopWatching
} = useMotion();

// 图表实例
let speedChart: echarts.ECharts | null = null;
let accelerationChart: echarts.ECharts | null = null;

// 图表容器引用
const speedChartRef = ref<HTMLElement | null>(null);
const accelerationChartRef = ref<HTMLElement | null>(null);

// 单位选项
const speedUnitOptions = [
  { value: 'ms', label: 'm/s' },
  { value: 'kmh', label: 'km/h' },
  { value: 'mph', label: 'mph' },
  { value: 'knots', label: '节' }
];

const accelerationUnitOptions = [
  { value: 'ms2', label: 'm/s²' },
  { value: 'g', label: 'g' }
];

// 速度单位标签
const speedUnitLabel = computed(() => getSpeedUnitLabel(settingsStore.settings.speedUnit));

// 加速度单位标签
const accelerationUnitLabel = computed(() => getAccelerationUnitLabel(settingsStore.settings.accelerationUnit));

// 格式化速度值
const formattedSpeed = computed(() => {
  if (motionData.value?.speed !== null && motionData.value?.speed !== undefined) {
    return convertSpeed(motionData.value.speed, settingsStore.settings.speedUnit).toFixed(1);
  }
  return '--';
});

// 格式化方向值
const formattedHeading = computed(() => {
  if (motionData.value?.heading !== null && motionData.value?.heading !== undefined) {
    return motionData.value.heading.toFixed(0);
  }
  return '--';
});

// 格式化加速度值
const formattedAcceleration = computed(() => {
  if (motionData.value?.acceleration?.magnitude !== null && motionData.value?.acceleration?.magnitude !== undefined) {
    return convertAcceleration(motionData.value.acceleration.magnitude, settingsStore.settings.accelerationUnit).toFixed(2);
  }
  return '--';
});

// 数据年龄（秒）
const currentTime = ref(Date.now());
let ageTimer: ReturnType<typeof setInterval> | null = null;

const dataAge = computed(() => {
  if (!motionData.value) return null;
  return Math.max(0, Math.floor((currentTime.value - motionData.value.timestamp) / 1000));
});

const formatDataAge = (seconds: number | null): string => {
  if (seconds === null) return '--';
  if (seconds < 1) return '刚刚';
  return `${seconds} 秒前`;
};

// 切换速度单位
const handleSpeedUnitChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setSpeedUnit(target.value as 'ms' | 'kmh' | 'mph' | 'knots');
};

// 切换加速度单位
const handleAccelerationUnitChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  settingsStore.setAccelerationUnit(target.value as 'ms2' | 'g');
};

// 方向描述
const headingDirection = computed(() => {
  const heading = motionData.value?.heading;
  if (heading === null || heading === undefined) return '--';

  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
});

// 连续显示角度，避免 0°/360° 边界处 CSS transition 绕远路
const displayHeading = ref(0);
let lastHeadingValue: number | null = null;

watch(() => motionData.value?.heading, (heading) => {
  if (heading === null || heading === undefined) {
    lastHeadingValue = null;
    return;
  }

  if (lastHeadingValue === null) {
    displayHeading.value = heading;
  } else {
    let delta = heading - lastHeadingValue;
    // 选择最短路径，避免跨越 0°/360° 时绕一整圈
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    displayHeading.value += delta;
  }

  lastHeadingValue = heading;
});

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    // 速度图表
    if (speedChartRef.value) {
      speedChart = echarts.init(speedChartRef.value, 'dark');
      speedChart.setOption(getChartOptions('速度', speedUnitLabel.value, '#00bcd4'));
    }

    // 加速度图表
    if (accelerationChartRef.value) {
      accelerationChart = echarts.init(accelerationChartRef.value, 'dark');
      accelerationChart.setOption(getChartOptions('加速度', 'm/s²', '#ff9800'));
    }
  });
};

// 获取图表配置
const getChartOptions = (title: string, unit: string, color: string) => ({
  title: {
    show: false
  },
  grid: {
    left: 2,
    right: 2,
    top: 4,
    bottom: 2,
    containLabel: false
  },
  xAxis: {
    type: 'category',
    show: false,
    data: []
  },
  yAxis: {
    type: 'value',
    show: false
  },
  series: [{
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: {
      width: 2,
      color: color
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `${color}40` },
        { offset: 1, color: `${color}05` }
      ])
    },
    data: []
  }],
  animation: false
});

// 更新图表数据（按当前单位转换）
const updateCharts = () => {
  const updateChart = (
    chart: echarts.ECharts | null,
    data: ChartDataPoint[],
    converter?: (value: number) => number
  ) => {
    if (!chart || data.length === 0) return;

    const values = data.map(d => converter ? converter(d.value) : d.value);
    chart.setOption({
      series: [{
        data: values
      }]
    });
  };

  updateChart(speedChart, speedHistory.value, (value) => convertSpeed(value, settingsStore.settings.speedUnit));
  updateChart(accelerationChart, accelerationHistory.value, (value) => convertAcceleration(value, settingsStore.settings.accelerationUnit));
};

// 处理窗口大小变化
const handleResize = () => {
  speedChart?.resize();
  accelerationChart?.resize();
};

// 切换监听状态
const toggleWatching = async () => {
  if (isActive.value) {
    stopWatching();
  } else {
    await startWatching();
  }
};

// 监听历史数据变化更新图表
watch([speedHistory, accelerationHistory], () => {
  updateCharts();
}, { deep: true });

// 监听设置变化更新图表
watch(() => settingsStore.settings.speedUnit, () => {
  if (speedChart) {
    speedChart.setOption(getChartOptions('速度', speedUnitLabel.value, '#00bcd4'));
  }
  updateCharts();
});

watch(() => settingsStore.settings.accelerationUnit, () => {
  if (accelerationChart) {
    accelerationChart.setOption(getChartOptions('加速度', accelerationUnitLabel.value, '#ff9800'));
  }
  updateCharts();
});

onMounted(() => {
  initCharts();
  window.addEventListener('resize', handleResize);

  // 注册模块生命周期
  lifecycleStore.registerModule('motion', {
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
  window.removeEventListener('resize', handleResize);
  speedChart?.dispose();
  accelerationChart?.dispose();

  lifecycleStore.unregisterModule('motion');

  if (ageTimer) {
    clearInterval(ageTimer);
    ageTimer = null;
  }
});
</script>

<template>
  <div class="motion-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">运动信息</h1>
      <div class="status-bar">
        <span class="status-indicator" :class="{ active: isActive }"></span>
        <span class="status-text">{{ isActive ? '监听中' : '已停止' }}</span>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="control-buttons">
      <button
        class="control-btn"
        :class="{ active: isActive }"
        @click="toggleWatching"
      >
        {{ isActive ? '停止监听' : '开始监听' }}
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 单位设置 -->
    <div class="unit-settings">
      <div class="unit-setting-item">
        <label class="unit-setting-label">速度单位</label>
        <select
          :value="settingsStore.settings.speedUnit"
          @change="handleSpeedUnitChange"
          class="unit-setting-select"
        >
          <option
            v-for="option in speedUnitOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="unit-setting-item">
        <label class="unit-setting-label">加速度单位</label>
        <select
          :value="settingsStore.settings.accelerationUnit"
          @change="handleAccelerationUnitChange"
          class="unit-setting-select"
        >
          <option
            v-for="option in accelerationUnitOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 数据卡片区域 -->
    <div class="data-cards">
      <!-- 速度卡片 -->
      <div class="data-card">
        <div class="card-content">
          <div class="main-data">
            <span class="data-value">{{ formattedSpeed }}</span>
            <span class="data-unit">{{ speedUnitLabel }}</span>
          </div>
          <div class="data-label">速度</div>
        </div>
        <div class="mini-chart" ref="speedChartRef"></div>
      </div>

      <!-- 方向卡片 -->
      <div class="data-card">
        <div class="card-content">
          <div class="main-data">
            <span class="data-value">{{ formattedHeading }}</span>
            <span class="data-unit">°</span>
            <span class="direction-label">{{ headingDirection }}</span>
          </div>
          <div class="data-label">方向</div>
        </div>
        <div class="compass-mini">
          <div class="compass-mini-ring">
            <span class="compass-mini-n">N</span>
            <span class="compass-mini-e">E</span>
            <span class="compass-mini-s">S</span>
            <span class="compass-mini-w">W</span>
          </div>
          <div class="compass-mini-needle" :style="{ transform: `rotate(${displayHeading}deg)` }">
            <div class="needle-head"></div>
            <div class="needle-tail"></div>
          </div>
          <div class="compass-mini-center"></div>
        </div>
      </div>

      <!-- 加速度卡片 -->
      <div class="data-card">
        <div class="card-content">
          <div class="main-data">
            <span class="data-value">{{ formattedAcceleration }}</span>
            <span class="data-unit">{{ accelerationUnitLabel }}</span>
          </div>
          <div class="data-label">加速度</div>
        </div>
        <div class="mini-chart" ref="accelerationChartRef"></div>
      </div>
    </div>

    <!-- 详细信息区域 -->
    <div class="details-section">
      <div class="detail-card">
        <h3 class="section-title">加速度分量</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">X轴</span>
            <span class="detail-value">{{ motionData?.acceleration ? convertAcceleration(motionData.acceleration.x, settingsStore.settings.accelerationUnit).toFixed(3) : '--' }} {{ accelerationUnitLabel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Y轴</span>
            <span class="detail-value">{{ motionData?.acceleration ? convertAcceleration(motionData.acceleration.y, settingsStore.settings.accelerationUnit).toFixed(3) : '--' }} {{ accelerationUnitLabel }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Z轴</span>
            <span class="detail-value">{{ motionData?.acceleration ? convertAcceleration(motionData.acceleration.z, settingsStore.settings.accelerationUnit).toFixed(3) : '--' }} {{ accelerationUnitLabel }}</span>
          </div>
        </div>
      </div>

      <div class="detail-card">
        <h3 class="section-title">状态信息</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">监听状态</span>
            <span class="detail-value" :class="{ 'status-active': isActive }">
              {{ isActive ? '运行中' : '已停止' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">数据更新</span>
            <span class="detail-value">
              {{ motionData?.timestamp ? new Date(motionData.timestamp).toLocaleTimeString() : '--' }}
            </span>
          </div>
          <div class="detail-item">
            <span class="detail-label">更新间隔</span>
            <span class="detail-value">
              {{ formatDataAge(dataAge) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.motion-view {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
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
  margin: 0;
  color: var(--color-text);
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

.control-buttons {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
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

.error-message {
  margin: var(--spacing-md);
  padding: var(--spacing-md);
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid var(--color-error);
  border-radius: 8px;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.data-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.data-card {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  min-height: 160px;
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.main-data {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.data-value {
  font-size: 36px;
  font-weight: 300;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
  line-height: 1.1;
}

.data-unit {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-left: var(--spacing-xs);
}

.direction-label {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin-left: var(--spacing-sm);
}

.data-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--spacing-xs);
}

.mini-chart {
  height: 60px;
  width: 100%;
  margin-top: auto;
}

.compass-mini {
  width: 70px;
  height: 70px;
  margin-top: auto;
  align-self: center;
  position: relative;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, var(--color-bg) 0%, var(--color-bg-secondary) 100%);
}

.compass-mini-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.compass-mini-ring span {
  position: absolute;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.compass-mini-n {
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-error) !important;
}

.compass-mini-e {
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
}

.compass-mini-s {
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.compass-mini-w {
  top: 50%;
  left: 4px;
  transform: translateY(-50%);
}

.compass-mini-needle {
  position: relative;
  width: 4px;
  height: 46px;
  transform-origin: center center;
  transition: transform 0.3s ease;
  z-index: 2;
}

.needle-head {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 24px solid var(--color-error);
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
}

.needle-tail {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 22px solid var(--color-text-muted);
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
}

.compass-mini-center {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text);
  z-index: 3;
}

.details-section {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.detail-card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
}

.section-title {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.detail-value {
  font-size: var(--font-size-md);
  color: var(--color-text);
  font-family: var(--font-family-mono);
}

.detail-value.status-active {
  color: var(--color-success);
}

/* 响应式布局 */
@media (max-width: 400px) {
  .data-cards {
    grid-template-columns: 1fr;
  }

  .data-value {
    font-size: 28px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>