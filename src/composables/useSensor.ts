import { ref, onUnmounted } from 'vue';
import { Motion } from '@capacitor/motion';
import type { PluginListenerHandle } from '@capacitor/core';
import type { SensorData, ChartDataPoint } from '@/types';
import { calculateMagneticDeclination } from '@/utils/coordinates';
import { throttle } from '@/utils/throttle';
import {
  parseCompassHeading,
  isSourceAtLeastAsGood,
  supportsAbsoluteOrientation,
  type DeviceOrientationEventExtended,
  type CompassSource
} from '@/utils/orientation';

// 显示层最小更新间隔（毫秒），避免传感器 60Hz 事件导致 UI 数字高速抖动
const MIN_DISPLAY_UPDATE_INTERVAL = 100;

export function useSensor() {
  const sensorData = ref<SensorData | null>(null);
  const error = ref<string | null>(null);
  const isActive = ref(false);

  // 历史数据
  const compassHistory = ref<ChartDataPoint[]>([]);
  const accelerometerHistory = ref<ChartDataPoint[]>([]);
  const gyroscopeHistory = ref<ChartDataPoint[]>([]);
  const magnetometerHistory = ref<ChartDataPoint[]>([]);

  // Capacitor Motion 监听器
  let accelListener: PluginListenerHandle | null = null;
  let orientationListener: PluginListenerHandle | null = null;

  // Android 绝对方向事件监听器（Capacitor Motion 插件未暴露 deviceorientationabsolute）
  let absoluteOrientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;

  // 当前罗盘数据来源，用于在多个来源共存时优先使用更可靠的数据
  let currentCompassSource: CompassSource = 'relative';

  // 清理历史数据（保留最近60秒）
  const cleanupHistory = () => {
    const now = Date.now();
    const maxAge = 60000; // 60秒

    compassHistory.value = compassHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    ).slice(-60);

    accelerometerHistory.value = accelerometerHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    ).slice(-60);

    gyroscopeHistory.value = gyroscopeHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    ).slice(-60);

    magnetometerHistory.value = magnetometerHistory.value.filter(
      (point: ChartDataPoint) => now - point.timestamp < maxAge
    ).slice(-60);
  };

  // 请求 iOS 13+ 的传感器权限
  const requestIOSPermissions = async (): Promise<boolean> => {
    try {
      if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const motionPermission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (motionPermission !== 'granted') {
          error.value = '运动传感器权限被拒绝';
          return false;
        }
      }

      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const orientationPermission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (orientationPermission !== 'granted') {
          error.value = '方向传感器权限被拒绝';
          return false;
        }
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '请求传感器权限失败';
      return false;
    }
  };

  // 开始监听传感器数据
  const startWatching = async () => {
    if (isActive.value) return;

    try {
      error.value = null;

      // 请求权限
      const hasPermission = await requestIOSPermissions();
      if (!hasPermission) return;

      const timestamp = Date.now();
      sensorData.value = {
        accelerometer: null,
        gyroscope: null,
        magnetometer: null,
        compass: null,
        compassSource: null,
        magneticDeclination: null,
        timestamp
      };

      // 监听加速度计（包含重力和陀螺仪旋转速率）
      // 节流到 100ms，避免 Motion accel 高频事件导致加速度计/陀螺仪数值高速抖动
      accelListener = await Motion.addListener('accel', throttle((event) => {
        const now = Date.now();

        if (!sensorData.value) {
          sensorData.value = {
            accelerometer: null,
            gyroscope: null,
            magnetometer: null,
            compass: null,
            compassSource: null,
            magneticDeclination: null,
            timestamp: now
          };
        }

        sensorData.value.timestamp = now;

        // 加速度计数据（包含重力）
        if (event.accelerationIncludingGravity) {
          const acc = event.accelerationIncludingGravity;
          sensorData.value.accelerometer = {
            x: acc.x ?? 0,
            y: acc.y ?? 0,
            z: acc.z ?? 0
          };

          const magnitude = Math.sqrt(
            (acc.x ?? 0) ** 2 +
            (acc.y ?? 0) ** 2 +
            (acc.z ?? 0) ** 2
          );

          accelerometerHistory.value.push({
            value: magnitude,
            timestamp: now
          });
        }

        // 陀螺仪数据（旋转速率，单位：度/秒）
        if (event.rotationRate) {
          sensorData.value.gyroscope = {
            x: event.rotationRate.alpha ?? 0,
            y: event.rotationRate.beta ?? 0,
            z: event.rotationRate.gamma ?? 0
          };

          const magnitude = Math.sqrt(
            (event.rotationRate.alpha ?? 0) ** 2 +
            (event.rotationRate.beta ?? 0) ** 2 +
            (event.rotationRate.gamma ?? 0) ** 2
          );

          gyroscopeHistory.value.push({
            value: magnitude,
            timestamp: now
          });
        }

        cleanupHistory();
      }, MIN_DISPLAY_UPDATE_INTERVAL));

      // 统一的罗盘方向处理
      // 罗盘方向不再节流，由 UI 层做平滑，保证类似原生指南针的实时感
      const handleOrientationEvent = (
        event: DeviceOrientationEventExtended,
        forceSource?: 'absolute'
      ) => {
        const reading = parseCompassHeading(event);
        if (!reading || !sensorData.value) return;

        const source = forceSource ?? reading.source;
        // 仅当新数据来源更可靠时才更新，避免 Android 上相对方向覆盖绝对方向
        if (!isSourceAtLeastAsGood(source, currentCompassSource)) return;

        currentCompassSource = source;
        sensorData.value.compass = reading.heading;
        sensorData.value.compassSource = source;
        sensorData.value.timestamp = Date.now();

        compassHistory.value.push({
          value: reading.heading,
          timestamp: Date.now()
        });

        cleanupHistory();
      };

      // 监听设备方向（deviceorientation，iOS 上含 webkitCompassHeading）
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

      isActive.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误';
    }
  };

  // 停止监听传感器数据
  const stopWatching = async () => {
    if (!isActive.value) return;

    if (accelListener) {
      await accelListener.remove();
      accelListener = null;
    }

    if (orientationListener) {
      await orientationListener.remove();
      orientationListener = null;
    }

    if (absoluteOrientationHandler) {
      window.removeEventListener('deviceorientationabsolute', absoluteOrientationHandler);
      absoluteOrientationHandler = null;
    }

    isActive.value = false;
    currentCompassSource = 'relative';
    sensorData.value = null;
    compassHistory.value = [];
    accelerometerHistory.value = [];
    gyroscopeHistory.value = [];
    magnetometerHistory.value = [];
  };

  // 更新磁偏角（需要位置信息）
  const updateMagneticDeclination = (latitude: number, longitude: number) => {
    if (sensorData.value) {
      sensorData.value.magneticDeclination = calculateMagneticDeclination(latitude, longitude);
    }
  };

  // 组件卸载时停止监听
  onUnmounted(() => {
    stopWatching();
  });

  return {
    sensorData,
    compassHistory,
    accelerometerHistory,
    gyroscopeHistory,
    magnetometerHistory,
    error,
    isActive,
    startWatching,
    stopWatching,
    updateMagneticDeclination
  };
}