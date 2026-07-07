import { ref } from 'vue';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';

export interface PermissionState {
  location: 'granted' | 'denied' | 'prompt';
  motion: 'granted' | 'denied' | 'prompt';
  orientation: 'granted' | 'denied' | 'prompt';
}

export function usePermissions() {
  const permissionState = ref<PermissionState>({
    location: 'prompt',
    motion: 'prompt',
    orientation: 'prompt'
  });

  // 检查位置权限
  const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      const permission = await Geolocation.checkPermissions();
      return permission.location === 'granted' ? 'granted' : 'prompt';
    } catch (error) {
      console.error('检查位置权限失败:', error);
      return 'prompt';
    }
  };

  // 请求位置权限
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const permission = await Geolocation.requestPermissions();
      const granted = permission.location === 'granted';
      permissionState.value.location = granted ? 'granted' : 'denied';
      return granted;
    } catch (error) {
      console.error('请求位置权限失败:', error);
      permissionState.value.location = 'denied';
      return false;
    }
  };

  // 请求运动传感器权限（iOS 13+）
  const requestMotionPermission = async (): Promise<boolean> => {
    try {
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const response = await (DeviceMotionEvent as any).requestPermission();
        const granted = response === 'granted';
        permissionState.value.motion = granted ? 'granted' : 'denied';
        return granted;
      }
      // Android 不需要显式请求
      permissionState.value.motion = 'granted';
      return true;
    } catch (error) {
      console.error('请求运动传感器权限失败:', error);
      permissionState.value.motion = 'denied';
      return false;
    }
  };

  // 请求方向传感器权限（iOS 13+）
  const requestOrientationPermission = async (): Promise<boolean> => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        const granted = response === 'granted';
        permissionState.value.orientation = granted ? 'granted' : 'denied';
        return granted;
      }
      // Android 不需要显式请求
      permissionState.value.orientation = 'granted';
      return true;
    } catch (error) {
      console.error('请求方向传感器权限失败:', error);
      permissionState.value.orientation = 'denied';
      return false;
    }
  };

  // 请求所有核心权限
  const requestAllPermissions = async (): Promise<PermissionState> => {
    // 按顺序请求权限，避免同时弹窗
    await requestLocationPermission();
    await requestMotionPermission();
    await requestOrientationPermission();

    return permissionState.value;
  };

  // 获取平台信息
  const getPlatformInfo = async () => {
    try {
      const info = await Device.getInfo();
      return info;
    } catch (error) {
      console.error('获取设备信息失败:', error);
      return null;
    }
  };

  return {
    permissionState,
    checkLocationPermission,
    requestLocationPermission,
    requestMotionPermission,
    requestOrientationPermission,
    requestAllPermissions,
    getPlatformInfo
  };
}