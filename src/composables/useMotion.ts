import { ref, onUnmounted, watch } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import type { PluginListenerHandle } from '@capacitor/core';
import type { MotionData, ChartDataPoint, ChartTimeRange } from '@/types';
import { useSettingsStore } from '@/stores/settings';
import { convertSpeed } from '@/utils/coordinates';
import {
  parseCompassHeading,
  isSourceAtLeastAsGood,
  supportsAbsoluteOrientation,
  type DeviceOrientationEventExtended,
  type CompassSource
} from '@/utils/orientation';

export function useMotion() {
  const settingsStore = useSettingsStore();
  const motionData = ref<MotionData | null>(null);
  const error = ref<string | null>(null);
  const isActive = ref(false);

  // 历史数据
  const speedHistory = ref<ChartDataPoint[]>([]);
  const altitudeHistory = ref<ChartDataPoint[]>([]);
  const accelerationHistory = ref<ChartDataPoint[]>([]);

  // 上一帧的速度（用于计算加速度）
  let lastSpeed: number | null = null;
  let lastTimestamp: number | null = null;

  // DeviceMotion 事件监听器
  let deviceMotionHandler: ((event: DeviceMotionEvent) => void) | null = null;

  // Capacitor Motion 方向监听器
  let orientationListener: PluginListenerHandle | null = null;

  // Android 绝对方向事件监听器（Capacitor Motion 插件未暴露 deviceorientationabsolute）
  let absoluteOrientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  // GPS 监听 ID
  let gpsWatchId: string | null = null;

  // 获取当前位置监听选项（Android 可通过 interval/minimumUpdateInterval 控制刷新频率）
  const getWatchOptions = () => {
    const interval = settingsStore.settings.refreshInterval;
    return {
      enableHighAccuracy: true,
      timeout: Math.max(interval, 10000),
      maximumAge: 0,
      interval,
      minimumUpdateInterval: interval
    };
  };

  // 当前设备朝向（用于实时方向，优先于 GPS heading）
  let deviceOrientation: number | null = null;
  // 当前设备朝向来源
  let currentOrientationSource: CompassSource = 'relative';
  // 最近一次 GPS heading
  let lastGPSHeading: number | null = null;
  // GPS heading 超时计时器
  let headingTimeout: ReturnType<typeof setTimeout> | null = null;

  // 时间范围到秒数和最大数据点数的映射
  const timeRangeConfig: Record<ChartTimeRange, { seconds: number; maxPoints: number }> = {
    '30s': { seconds: 30, maxPoints: 30 },
    '1m': { seconds: 60, maxPoints: 60 },
    '5m': { seconds: 300, maxPoints: 300 }
  };

  // 获取当前时间范围配置
  const getCurrentTimeRangeConfig = () => timeRangeConfig[settingsStore.settings.chartTimeRange];

  // 清理历史数据
  const cleanupHistory = () => {
    const { seconds, maxPoints } = getCurrentTimeRangeConfig();
    const now = Date.now();
    const maxAge = seconds * 1000;

    speedHistory.value = speedHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    );
    altitudeHistory.value = altitudeHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    );
    accelerationHistory.value = accelerationHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    );

    // 限制最大数量
    if (speedHistory.value.length > maxPoints) {
      speedHistory.value = speedHistory.value.slice(-maxPoints);
    }
    if (altitudeHistory.value.length > maxPoints) {
      altitudeHistory.value = altitudeHistory.value.slice(-maxPoints);
    }
    if (accelerationHistory.value.length > maxPoints) {
      accelerationHistory.value = accelerationHistory.value.slice(-maxPoints);
    }
  };

  // 监听图表时间范围变化，立即清理历史数据
  watch(() => settingsStore.settings.chartTimeRange, () => {
    cleanupHistory();
  });

  // 刷新间隔变化时，如果正在监听则重启以应用新选项
  watch(() => settingsStore.settings.refreshInterval, async () => {
    if (isActive.value && gpsWatchId) {
      await stopWatching();
      await startWatching();
    }
  });

  // 计算当前有效方向（优先 GPS heading，否则使用 deviceOrientation）
  const getCurrentHeading = (): { heading: number | null; source: CompassSource | null } => {
    // 如果有有效的 GPS heading 且在最近 2 秒内更新过，优先使用
    if (lastGPSHeading !== null) {
      return { heading: lastGPSHeading, source: 'absolute' };
    }
    // 否则使用设备朝向
    return { heading: deviceOrientation, source: deviceOrientation !== null ? currentOrientationSource : null };
  };

  // 处理设备方向事件，解析为顺时针罗盘航向
  const handleOrientationEvent = (
    event: DeviceOrientationEventExtended,
    forceSource?: 'absolute'
  ) => {
    const reading = parseCompassHeading(event);
    if (!reading) return;

    const source = forceSource ?? reading.source;
    // 仅当新数据来源更可靠时才更新，避免 Android 上相对方向覆盖绝对方向
    if (!isSourceAtLeastAsGood(source, currentOrientationSource)) return;

    currentOrientationSource = source;
    deviceOrientation = reading.heading;

    // 如果没有 GPS heading 或当前没有运动数据，立即更新方向
    if (lastGPSHeading === null) {
      if (motionData.value) {
        motionData.value.heading = reading.heading;
        motionData.value.headingSource = source;
        motionData.value.timestamp = Date.now();
      } else {
        motionData.value = {
          speed: null,
          speedKmh: null,
          heading: reading.heading,
          headingSource: source,
          altitude: null,
          verticalSpeed: null,
          acceleration: null,
          timestamp: Date.now()
        };
      }
    }
  };

  // 处理 GPS 位置更新
  const handleGPSUpdate = (pos: { coords: { speed: number | null; heading: number | null; altitude: number | null }; timestamp: number }) => {
    const timestamp = pos.timestamp;
    const speed = pos.coords.speed ?? null;
    const gpsHeading = pos.coords.heading ?? null;
    const altitude = pos.coords.altitude ?? null;

    // 更新 GPS heading
    if (gpsHeading !== null) {
      lastGPSHeading = gpsHeading;
      // 2 秒后如果没有新的 GPS heading，则回退到设备朝向
      if (headingTimeout) {
        clearTimeout(headingTimeout);
      }
      headingTimeout = setTimeout(() => {
        lastGPSHeading = null;
      }, 2000);
    }

    // 计算垂直速度
    let verticalSpeed: number | null = null;
    if (lastSpeed !== null && lastTimestamp !== null && altitude !== null && motionData.value?.altitude !== null) {
      const deltaTime = (timestamp - lastTimestamp) / 1000;
      const deltaAltitude = altitude - (motionData.value?.altitude ?? 0);
      if (deltaTime > 0) {
        verticalSpeed = deltaAltitude / deltaTime;
      }
    }

    if (speed !== null) {
      lastSpeed = speed;
      lastTimestamp = timestamp;
    }

    // 更新运动数据（保留加速度数据）
    const currentHeading = getCurrentHeading();
    motionData.value = {
      speed,
      speedKmh: speed !== null ? convertSpeed(speed, settingsStore.settings.speedUnit) : null,
      heading: currentHeading.heading,
      headingSource: currentHeading.source,
      altitude,
      verticalSpeed,
      acceleration: motionData.value?.acceleration ?? null,
      timestamp
    };

    // 添加到历史数据
    if (speed !== null) {
      speedHistory.value.push({
        value: speed,
        timestamp: Date.now()
      });
    }

    if (altitude !== null) {
      altitudeHistory.value.push({
        value: altitude,
        timestamp: Date.now()
      });
    }

    cleanupHistory();
  };

  // 开始监听运动数据
  const startWatching = async () => {
    if (isActive.value) return;

    try {
      error.value = null;

      // 请求位置权限
      const locationPermission = await Geolocation.requestPermissions();
      if (locationPermission.location !== 'granted') {
        error.value = '位置权限被拒绝';
        return;
      }

      // 检查是否支持 DeviceMotion
      if (!window.DeviceMotionEvent) {
        error.value = '设备不支持运动传感器';
        return;
      }

      // 请求运动传感器权限（iOS 13+ 需要）
      if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') {
          error.value = '运动传感器权限被拒绝';
          return;
        }
      }

      // 请求方向传感器权限（iOS 13+ 需要，orientation / deviceorientationabsolute 使用）
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') {
          error.value = '方向传感器权限被拒绝';
          return;
        }
      }

      // 监听 GPS（获取速度、海拔、方向）
      gpsWatchId = await Geolocation.watchPosition(
        getWatchOptions(),
        (pos, err) => {
          if (err) {
            console.error('GPS 监听错误:', err.message);
            return;
          }
          if (pos) {
            handleGPSUpdate(pos);
          }
        }
      );

      // 监听设备方向（获取实时朝向，用于补充 GPS heading）
      orientationListener = await Motion.addListener(
        'orientation',
        (event) => handleOrientationEvent(event as DeviceOrientationEventExtended)
      );

      // Android：额外监听 deviceorientationabsolute 获取绝对方向
      if (supportsAbsoluteOrientation()) {
        absoluteOrientationHandler = (event) => {
          handleOrientationEvent(event as DeviceOrientationEventExtended, 'absolute');
        };
        window.addEventListener(
          'deviceorientationabsolute',
          absoluteOrientationHandler
        );
      }

      // 监听设备运动事件（获取加速度）
      deviceMotionHandler = (event: DeviceMotionEvent) => {
        const timestamp = Date.now();

        // 计算加速度
        let accelerationData = null;
        if (event.accelerationIncludingGravity) {
          const acc = event.accelerationIncludingGravity;
          const magnitude = Math.sqrt(
            (acc.x || 0) ** 2 +
            (acc.y || 0) ** 2 +
            (acc.z || 0) ** 2
          );
          accelerationData = {
            x: acc.x || 0,
            y: acc.y || 0,
            z: acc.z || 0,
            magnitude
          };

          // 添加到加速度历史
          accelerationHistory.value.push({
            value: magnitude,
            timestamp
          });
        }

        // 更新运动数据（保留 GPS 数据）
        if (motionData.value) {
          motionData.value.acceleration = accelerationData;
          motionData.value.timestamp = timestamp;
        } else {
          motionData.value = {
            speed: null,
            speedKmh: null,
            heading: null,
            headingSource: null,
            altitude: null,
            verticalSpeed: null,
            acceleration: accelerationData,
            timestamp
          };
        }

        cleanupHistory();
      };

      window.addEventListener('devicemotion', deviceMotionHandler);
      isActive.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
    }
  };

  // 停止监听运动数据
  const stopWatching = async () => {
    if (!isActive.value) return;

    if (deviceMotionHandler) {
      window.removeEventListener('devicemotion', deviceMotionHandler);
      deviceMotionHandler = null;
    }

    if (orientationListener) {
      await orientationListener.remove();
      orientationListener = null;
    }

    if (absoluteOrientationHandler) {
      window.removeEventListener('deviceorientationabsolute', absoluteOrientationHandler);
      absoluteOrientationHandler = null;
    }

    if (gpsWatchId) {
      Geolocation.clearWatch({ id: gpsWatchId });
      gpsWatchId = null;
    }

    if (headingTimeout) {
      clearTimeout(headingTimeout);
      headingTimeout = null;
    }

    isActive.value = false;
    motionData.value = null;
    lastSpeed = null;
    lastTimestamp = null;
    lastGPSHeading = null;
    deviceOrientation = null;
    currentOrientationSource = 'relative';
  };

  // 更新速度数据（从GPS）
  const updateSpeed = (speed: number, heading: number | null, altitude: number | null) => {
    if (!motionData.value) {
      motionData.value = {
        speed,
        speedKmh: convertSpeed(speed, settingsStore.settings.speedUnit),
        heading,
        headingSource: heading !== null ? 'absolute' : null,
        altitude,
        verticalSpeed: null,
        acceleration: null,
        timestamp: Date.now()
      };
    } else {
      motionData.value.speed = speed;
      motionData.value.speedKmh = convertSpeed(speed, settingsStore.settings.speedUnit);
      motionData.value.heading = heading;
      motionData.value.headingSource = heading !== null ? 'absolute' : null;
      motionData.value.altitude = altitude;
      motionData.value.timestamp = Date.now();
    }

    // 添加到历史数据
    speedHistory.value.push({
      value: speed,
      timestamp: Date.now()
    });

    if (altitude !== null) {
      altitudeHistory.value.push({
        value: altitude,
        timestamp: Date.now()
      });
    }

    cleanupHistory();
  };

  // 组件卸载时停止监听
  onUnmounted(() => {
    stopWatching();
  });

  return {
    motionData,
    speedHistory,
    altitudeHistory,
    accelerationHistory,
    error,
    isActive,
    startWatching,
    stopWatching,
    updateSpeed
  };
}