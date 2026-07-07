<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useSensor } from '@/composables/useSensor';
import { useSettingsStore } from '@/stores/settings';
import { useModuleLifecycleStore } from '@/stores/moduleLifecycle';

const settingsStore = useSettingsStore();
const lifecycleStore = useModuleLifecycleStore();
const {
  sensorData,
  compassHistory,
  accelerometerHistory,
  gyroscopeHistory,
  error,
  isActive,
  startWatching,
  stopWatching
} = useSensor();

// 模拟罗盘显示角度（相对于正北）
const compassAngle = ref(0);

// 更新罗盘角度
watch(() => sensorData.value?.compass, (compass) => {
  if (compass !== null && compass !== undefined) {
    compassAngle.value = compass;
  }
});

onMounted(() => {
  // 注册模块生命周期
  lifecycleStore.registerModule('sensor', {
    start: startWatching,
    stop: stopWatching,
    get isActive() { return isActive.value; }
  });
});

onUnmounted(() => {
  lifecycleStore.unregisterModule('sensor');
});

// 获取方向标签
const getDirectionLabel = (angle: number): string => {
  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
};

// 格式化角度
const formatAngle = (angle: number): string => {
  return `${angle.toFixed(1)}°`;
};
</script>

<template>
  <div class="sensor-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">传感器</h1>
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
        @click="startWatching"
        :disabled="isActive"
      >
        开始监听
      </button>
      <button
        class="control-btn"
        :class="{ active: !isActive }"
        @click="stopWatching"
        :disabled="!isActive"
      >
        停止监听
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-card card">
      <p>{{ error }}</p>
    </div>

    <!-- 罗盘显示 -->
    <div class="card compass-card">
      <h3 class="card-title">罗盘方向</h3>
      <div class="compass-container">
        <!-- 罗盘背景 -->
        <div class="compass-ring">
          <!-- 刻度线 -->
          <div
            v-for="angle in [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]"
            :key="angle"
            class="compass-tick"
            :class="{ major: angle % 90 === 0 }"
            :style="{ transform: `rotate(${angle}deg)` }"
          ></div>
          <!-- 方向文字 -->
          <div class="compass-direction compass-direction-n">N</div>
          <div class="compass-direction compass-direction-e">E</div>
          <div class="compass-direction compass-direction-s">S</div>
          <div class="compass-direction compass-direction-w">W</div>
        </div>
        <!-- 方向指针（指示设备当前朝向，红色端为前方） -->
        <div class="compass-pointer" :style="{ transform: `rotate(${compassAngle}deg)` }">
          <div class="pointer-north"></div>
          <div class="pointer-south"></div>
        </div>
        <!-- 中心点 -->
        <div class="compass-center"></div>
      </div>
      <div class="compass-info">
        <div class="data-value-small">{{ formatAngle(compassAngle) }}</div>
        <div class="data-label">{{ getDirectionLabel(compassAngle) }}</div>
      </div>
    </div>

    <!-- 三轴传感器数据 -->
    <div v-if="sensorData" class="card">
      <h3 class="card-title">传感器数据</h3>

      <!-- 加速度计 -->
      <div class="sensor-section">
        <div class="section-title">加速度计 (含重力)</div>
        <div class="axis-grid">
          <div class="axis-item">
            <div class="axis-label">X轴</div>
            <div class="axis-value">
              {{ sensorData.accelerometer?.x?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">m/s²</div>
          </div>
          <div class="axis-item">
            <div class="axis-label">Y轴</div>
            <div class="axis-value">
              {{ sensorData.accelerometer?.y?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">m/s²</div>
          </div>
          <div class="axis-item">
            <div class="axis-label">Z轴</div>
            <div class="axis-value">
              {{ sensorData.accelerometer?.z?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">m/s²</div>
          </div>
        </div>
      </div>

      <!-- 陀螺仪 -->
      <div class="sensor-section">
        <div class="section-title">陀螺仪 (旋转速率)</div>
        <div class="axis-grid">
          <div class="axis-item">
            <div class="axis-label">X轴</div>
            <div class="axis-value">
              {{ sensorData.gyroscope?.x?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">rad/s</div>
          </div>
          <div class="axis-item">
            <div class="axis-label">Y轴</div>
            <div class="axis-value">
              {{ sensorData.gyroscope?.y?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">rad/s</div>
          </div>
          <div class="axis-item">
            <div class="axis-label">Z轴</div>
            <div class="axis-value">
              {{ sensorData.gyroscope?.z?.toFixed(2) || '--' }}
            </div>
            <div class="axis-unit">rad/s</div>
          </div>
        </div>
      </div>

      <!-- 磁偏角 -->
      <div v-if="sensorData.magneticDeclination" class="sensor-section">
        <div class="section-title">磁偏角</div>
        <div class="declination-info">
          <div class="data-value-small">
            {{ sensorData.magneticDeclination.toFixed(1) }}°
          </div>
          <div class="data-label">
            {{ sensorData.magneticDeclination > 0 ? '东偏' : '西偏' }}
          </div>
        </div>
      </div>

      <!-- 磁力计 (需要原生插件) -->
      <div class="sensor-section info-section">
        <div class="section-title">磁力计</div>
        <div class="info-text">
          <p>注：磁力计原始数据需要原生插件支持</p>
          <p v-if="!sensorData.magnetometer">当前仅显示罗盘方向</p>
          <div v-else class="axis-grid">
            <div class="axis-item">
              <div class="axis-label">X轴</div>
              <div class="axis-value">
                {{ sensorData.magnetometer.x.toFixed(2) }}
              </div>
              <div class="axis-unit">μT</div>
            </div>
            <div class="axis-item">
              <div class="axis-label">Y轴</div>
              <div class="axis-value">
                {{ sensorData.magnetometer.y.toFixed(2) }}
              </div>
              <div class="axis-unit">μT</div>
            </div>
            <div class="axis-item">
              <div class="axis-label">Z轴</div>
              <div class="axis-value">
                {{ sensorData.magnetometer.z.toFixed(2) }}
              </div>
              <div class="axis-unit">μT</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无数据提示 -->
    <div v-else class="card empty-state">
      <div class="empty-text">
        <p>无传感器数据</p>
        <p class="info-text">请点击"开始监听"按钮</p>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="card info-card">
      <h3 class="card-title">使用说明</h3>
      <ul class="info-list">
        <li>罗盘方向：设备的朝向（相对于正北）</li>
        <li>加速度计：包含重力加速度（约9.8 m/s²）</li>
        <li>陀螺仪：设备的旋转速率</li>
        <li>磁偏角：当地磁北与真北的偏差</li>
      </ul>
      <p class="info-text">iOS设备可能需要手动授权传感器访问权限。</p>
    </div>
  </div>
</template>

<style scoped>
.sensor-view {
  padding-bottom: 80px;
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

.error-card {
  background: var(--color-error);
  color: white;
}

/* 罗盘样式 */
.compass-card {
  padding: 24px;
}

.compass-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 16px;
}

.compass-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid var(--color-primary);
  border-radius: 50%;
  background: var(--color-bg-secondary);
}

.compass-tick {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 10px;
  margin-left: -1px;
  background: var(--color-border);
  transform-origin: center 100px;
}

.compass-tick.major {
  height: 16px;
  width: 3px;
  margin-left: -1.5px;
  background: var(--color-primary);
}

.compass-direction {
  position: absolute;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.compass-direction-n {
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--color-error);
}

.compass-direction-e {
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
}

.compass-direction-s {
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
}

.compass-direction-w {
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
}

.compass-pointer {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: center;
}

.pointer-north {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 80px solid var(--color-error);
}

.pointer-south {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 80px solid var(--color-text-muted);
}

.compass-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  border: 2px solid var(--color-bg);
}

.compass-info {
  text-align: center;
}

.data-value-small {
  font-size: 32px;
  font-weight: 500;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
}

/* 传感器数据 */
.sensor-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 12px;
}

.axis-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.axis-item {
  text-align: center;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.axis-label {
  font-size: 14px;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.axis-value {
  font-size: 24px;
  font-weight: 500;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
}

.axis-unit {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.declination-info {
  text-align: center;
  padding: 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
}

.info-section {
  background: var(--color-bg-secondary);
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
}

.info-text {
  color: var(--color-text-muted);
  font-size: 14px;
  margin: 8px 0;
}

.empty-state {
  text-align: center;
  padding: 48px;
}

.empty-text {
  color: var(--color-text-muted);
}

.info-card {
  background: var(--color-bg-secondary);
  border-left: 4px solid var(--color-warning);
}

.info-list {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--color-text-secondary);
}

.info-list li {
  margin: 4px 0;
}

@media (max-width: 400px) {
  .compass-container {
    width: 160px;
    height: 160px;
  }

  .axis-grid {
    grid-template-columns: 1fr;
  }

  .control-buttons {
    flex-direction: column;
  }
}
</style>