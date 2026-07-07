<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useModuleLifecycleStore } from '@/stores/moduleLifecycle';
import { useSignal } from '@/composables/useSignal';

const lifecycleStore = useModuleLifecycleStore();
const {
  isActive,
  gpsDetails,
  wifiList,
  networkLatency,
  error,
  startWatching,
  stopWatching,
  testLatency
} = useSignal();

onMounted(() => {
  // 注册模块生命周期
  lifecycleStore.registerModule('signal', {
    start: startWatching,
    stop: stopWatching,
    get isActive() { return isActive.value; }
  });
});

onUnmounted(() => {
  lifecycleStore.unregisterModule('signal');
});
</script>

<template>
  <div class="signal-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">信号信息</h1>
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
      <button
        class="control-btn secondary"
        @click="testLatency"
        :disabled="!networkLatency?.isOnline"
      >
        测试延迟
      </button>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-card card">
      <p>{{ error }}</p>
    </div>

    <!-- 网络状态 -->
    <div v-if="networkLatency" class="card">
      <h3 class="card-title">网络状态</h3>
      <div class="grid grid-2">
        <div class="data-item">
          <div class="data-label">连接状态</div>
          <div class="data-value-small">
            {{ networkLatency.isOnline ? '在线' : '离线' }}
          </div>
        </div>
        <div class="data-item">
          <div class="data-label">连接类型</div>
          <div class="data-value-small">
            {{ networkLatency.connectionType }}
          </div>
        </div>
        <div class="data-item">
          <div class="data-label">延迟</div>
          <div class="data-value-small">
            {{ networkLatency.latency ? `${networkLatency.latency} ms` : '未测试' }}
          </div>
        </div>
        <div class="data-item">
          <div class="data-label">丢包率</div>
          <div class="data-value-small">
            {{ networkLatency.packetLoss ? `${networkLatency.packetLoss}%` : 'N/A' }}
          </div>
        </div>
      </div>
    </div>

    <!-- GPS卫星信息 -->
    <div v-if="gpsDetails" class="card">
      <h3 class="card-title">GPS卫星信息</h3>
      <div class="info-text">
        <p>注：卫星详细信息需要原生插件支持</p>
        <p>可见卫星: {{ gpsDetails.satellitesVisible }}</p>
        <p>使用卫星: {{ gpsDetails.satellitesUsed }}</p>
      </div>
      <div class="satellite-grid">
        <div v-for="sat in gpsDetails.satellites" :key="sat.prn" class="satellite-item">
          <div class="sat-prn">{{ sat.prn }}</div>
          <div class="sat-snr">{{ sat.snr || '--' }} dB</div>
          <div class="sat-status" :class="{ used: sat.usedInFix }">
            {{ sat.usedInFix ? '✓' : '○' }}
          </div>
        </div>
      </div>
    </div>

    <!-- WiFi信息 -->
    <div class="card">
      <h3 class="card-title">WiFi信息</h3>
      <div class="info-text">
        <p v-if="wifiList.length === 0">注：WiFi扫描需要原生插件支持</p>
        <p v-else>检测到 {{ wifiList.length }} 个WiFi网络</p>
      </div>
      <div class="wifi-list">
        <div v-for="wifi in wifiList" :key="wifi.bssid" class="wifi-item">
          <div class="wifi-ssid">{{ wifi.ssid || '隐藏网络' }}</div>
          <div class="wifi-details">
            <span class="wifi-channel">信道 {{ wifi.channel }}</span>
            <span class="wifi-rssi">{{ wifi.rssi }} dBm</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用说明 -->
    <div class="card info-card">
      <h3 class="card-title">使用说明</h3>
      <p class="info-text">信号信息功能需要以下原生插件支持：</p>
      <ul class="plugin-list">
        <li>@capacitor-community/wifi - WiFi扫描</li>
        <li>自定义插件 - GPS卫星详情</li>
        <li>自定义插件 - 网络延迟测试</li>
      </ul>
      <p class="info-text">当前版本仅显示基础网络状态。</p>
    </div>
  </div>
</template>

<style scoped>
.signal-view {
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

.grid {
  display: grid;
  gap: 16px;
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.data-item {
  text-align: center;
}

.data-value-small {
  font-size: 24px;
  font-weight: 500;
  color: var(--color-primary);
  font-family: var(--font-family-mono);
}

.info-text {
  color: var(--color-text-muted);
  font-size: 14px;
  margin: 8px 0;
}

.satellite-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.satellite-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  font-size: 12px;
}

.sat-prn {
  font-weight: 500;
  color: var(--color-text);
}

.sat-snr {
  color: var(--color-text-muted);
  margin-top: 4px;
}

.sat-status {
  color: var(--color-text-muted);
  margin-top: 4px;
}

.sat-status.used {
  color: var(--color-success);
}

.wifi-list {
  margin-top: 12px;
}

.wifi-item {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
}

.wifi-item:last-child {
  border-bottom: none;
}

.wifi-ssid {
  font-weight: 500;
  color: var(--color-text);
}

.wifi-details {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  font-size: 14px;
  color: var(--color-text-muted);
}

.wifi-rssi {
  color: var(--color-primary);
}

.info-card {
  background: var(--color-bg-secondary);
  border-left: 4px solid var(--color-warning);
}

.plugin-list {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--color-text-secondary);
}

.plugin-list li {
  margin: 4px 0;
}

@media (max-width: 400px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }

  .control-buttons {
    flex-direction: column;
  }
}
</style>