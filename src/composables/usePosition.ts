import { ref, onUnmounted, watch } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import type { PositionData, CoordinateFormats } from '@/types';
import { useSettingsStore } from '@/stores/settings';
import { toUTM, toMGRS } from '@/utils/utmMgrs';
import { decimalToDMS, formatDD } from '@/utils/coordinates';

export function usePosition() {
  const settingsStore = useSettingsStore();
  const position = ref<PositionData | null>(null);
  const coordinates = ref<CoordinateFormats | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);
  const isActive = ref(false);

  let watchId: string | null = null;

  // 获取当前位置监听选项
  const getWatchOptions = () => {
    const interval = settingsStore.settings.refreshInterval;
    return {
      enableHighAccuracy: true,
      timeout: Math.max(interval, 10000),
      maximumAge: 0,
      // Android 专属：控制 watchPosition 的刷新间隔
      interval,
      minimumUpdateInterval: interval
    };
  };

  // 更新坐标格式
  const updateCoordinates = (lat: number, lon: number) => {
    try {
      const utm = toUTM(lat, lon);
      const mgrs = toMGRS(lat, lon);

      coordinates.value = {
        dd: {
          latitude: formatDD(lat),
          longitude: formatDD(lon)
        },
        dms: {
          latitude: decimalToDMS(lat, true),
          longitude: decimalToDMS(lon, false)
        },
        utm,
        mgrs,
        plusCode: '' // Plus Code 需要额外实现
      };
    } catch (err) {
      console.error('坐标转换失败:', err);
    }
  };

  // 开始监听位置
  const startWatching = async () => {
    if (isActive.value) return;

    try {
      isLoading.value = true;
      error.value = null;

      // 请求权限
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        error.value = '位置权限被拒绝';
        isLoading.value = false;
        return;
      }

      // 开始监听位置变化
      watchId = await Geolocation.watchPosition(
        getWatchOptions(),
        (pos, err) => {
          if (err) {
            error.value = err.message;
            return;
          }

          if (pos) {
            position.value = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude ?? null,
              accuracy: pos.coords.accuracy ?? null,
              altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
              heading: pos.coords.heading ?? null,
              speed: pos.coords.speed ?? null,
              timestamp: pos.timestamp
            };

            updateCoordinates(pos.coords.latitude, pos.coords.longitude);
          }
        }
      );

      isActive.value = true;
      isLoading.value = false;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
      isLoading.value = false;
    }
  };

  // 停止监听位置
  const stopWatching = async () => {
    if (!isActive.value || !watchId) return;

    try {
      await Geolocation.clearWatch({ id: watchId });
      watchId = null;
      isActive.value = false;
      position.value = null;
      coordinates.value = null;
    } catch (err) {
      console.error('停止位置监听失败:', err);
    }
  };

  // 获取单次位置
  const getCurrentPosition = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        error.value = '位置权限被拒绝';
        isLoading.value = false;
        return null;
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      position.value = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude ?? null,
        accuracy: pos.coords.accuracy ?? null,
        altitudeAccuracy: pos.coords.altitudeAccuracy ?? null,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed ?? null,
        timestamp: pos.timestamp
      };

      updateCoordinates(pos.coords.latitude, pos.coords.longitude);
      isLoading.value = false;
      return position.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
      isLoading.value = false;
      return null;
    }
  };

  // 刷新间隔变化时，如果正在监听则重启以应用新选项
  watch(() => settingsStore.settings.refreshInterval, async () => {
    if (isActive.value && watchId) {
      await stopWatching();
      await startWatching();
    }
  });

  // 组件卸载时停止监听
  onUnmounted(() => {
    stopWatching();
  });

  return {
    position,
    coordinates,
    error,
    isLoading,
    isActive,
    startWatching,
    stopWatching,
    getCurrentPosition
  };
}