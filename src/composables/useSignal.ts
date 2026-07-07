import { ref } from 'vue';
import { Network } from '@capacitor/network';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import type { Network as CapacitorWifiNetwork, WifiInfo as CapacitorWifiInfo } from '@capgo/capacitor-wifi';
import type { GPSDetails, WiFiInfo, NetworkLatency } from '@/types';

export function useSignal() {
  const isActive = ref(false);
  const gpsDetails = ref<GPSDetails | null>(null);
  const wifiList = ref<WiFiInfo[]>([]);
  const networkLatency = ref<NetworkLatency | null>(null);
  const error = ref<string | null>(null);

  // 网络状态监听器清理函数
  let networkStatusCleanup: (() => Promise<void>) | null = null;

  // 扫描并获取 WiFi 列表
  const scanWiFiNetworks = async () => {
    try {
      // 请求权限
      const permission = await CapacitorWifi.requestPermissions();
      if (permission.location !== 'granted') {
        console.warn('WiFi 扫描需要位置权限');
        return;
      }

      // 开始扫描
      await CapacitorWifi.startScan();

      // 获取可用网络（Android 可用；iOS 受限，可能返回空数组）
      const { networks } = await CapacitorWifi.getAvailableNetworks();

      wifiList.value = networks.map((network: CapacitorWifiNetwork) => ({
        ssid: network.ssid || '隐藏网络',
        bssid: '00:00:00:00:00:00',
        rssi: network.rssi,
        frequency: 0,
        channel: 0,
        security: network.securityTypes ? network.securityTypes.join(', ') : 'Unknown',
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('WiFi 扫描失败:', err);
      // 如果插件不可用，不阻塞其他功能
    }
  };

  // 获取当前连接的 WiFi 信息
  const getCurrentWiFiInfo = async () => {
    try {
      const info: CapacitorWifiInfo = await CapacitorWifi.getWifiInfo();
      if (info && info.ssid) {
        const currentWiFi: WiFiInfo = {
          ssid: info.ssid,
          bssid: info.bssid || '00:00:00:00:00:00',
          rssi: info.signalStrength ?? -100,
          frequency: info.frequency ?? 0,
          channel: 0,
          security: 'Unknown',
          timestamp: Date.now()
        };

        // 如果列表中没有当前网络，加入列表
        const exists = wifiList.value.some(wifi => wifi.bssid === currentWiFi.bssid);
        if (!exists) {
          wifiList.value.unshift(currentWiFi);
        }
      }
    } catch (err) {
      console.error('获取当前 WiFi 信息失败:', err);
    }
  };

  // 开始监听信号信息
  const startWatching = async () => {
    if (isActive.value) return;

    try {
      isActive.value = true;
      error.value = null;

      // 获取网络状态
      const status = await Network.getStatus();
      networkLatency.value = {
        isOnline: status.connected,
        connectionType: status.connectionType as 'wifi' | 'cellular' | 'none' | 'unknown',
        latency: null,
        packetLoss: null,
        timestamp: Date.now()
      };

      // 监听网络变化
      const listener = await Network.addListener('networkStatusChange', (status) => {
        networkLatency.value = {
          isOnline: status.connected,
          connectionType: status.connectionType as 'wifi' | 'cellular' | 'none' | 'unknown',
          latency: networkLatency.value?.latency ?? null,
          packetLoss: networkLatency.value?.packetLoss ?? null,
          timestamp: Date.now()
        };
      });

      networkStatusCleanup = async () => {
        await listener.remove();
      };

      // GPS 卫星详细信息需要原生插件，当前用占位数据
      gpsDetails.value = {
        satellites: [],
        satellitesUsed: 0,
        satellitesVisible: 0,
        dop: {
          pdop: null,
          hdop: null,
          vdop: null
        },
        fixType: 'Unknown',
        timestamp: Date.now()
      };

      // 扫描 WiFi
      await scanWiFiNetworks();
      await getCurrentWiFiInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
      isActive.value = false;
    }
  };

  // 停止监听
  const stopWatching = async () => {
    if (!isActive.value) return;

    try {
      if (networkStatusCleanup) {
        await networkStatusCleanup();
        networkStatusCleanup = null;
      }

      isActive.value = false;
      gpsDetails.value = null;
      wifiList.value = [];
      networkLatency.value = null;
    } catch (err) {
      console.error('停止监听失败:', err);
    }
  };

  // 测试网络延迟
  const testLatency = async () => {
    if (!networkLatency.value?.isOnline) return;

    try {
      const start = Date.now();
      // 使用 HEAD 请求测试延迟
      await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store'
      });
      const latency = Date.now() - start;

      if (networkLatency.value) {
        networkLatency.value.latency = latency;
        networkLatency.value.timestamp = Date.now();
      }
    } catch (err) {
      console.error('延迟测试失败:', err);
      if (networkLatency.value) {
        networkLatency.value.latency = null;
      }
    }
  };

  return {
    isActive,
    gpsDetails,
    wifiList,
    networkLatency,
    error,
    startWatching,
    stopWatching,
    testLatency
  };
}