import type { CoordinateFormats } from '@/types';

/**
 * 将十进制度数转换为度分秒格式
 */
export function decimalToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
  
  const direction = isLatitude 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/**
 * 将十进制度数格式化为字符串
 */
export function formatDD(decimal: number, decimals: number = 6): string {
  return decimal.toFixed(decimals);
}

/**
 * 根据频率计算WiFi信道
 */
export function frequencyToChannel(frequency: number): number {
  if (frequency >= 2412 && frequency <= 2484) {
    return frequency === 2484 ? 14 : (frequency - 2407) / 5;
  } else if (frequency >= 5170 && frequency <= 5825) {
    return (frequency - 5000) / 5;
  }
  return 0;
}

/**
 * 计算磁偏角（简化的世界磁偏角模型）
 * 实际应用中应使用更精确的模型如 IGRF
 */
export function calculateMagneticDeclination(
  _latitude: number,
  longitude: number,
  _altitude: number = 0
): number {
  // 简化的磁偏角计算
  // 实际应用中应使用IGRF或WMM模型
  // 这里返回一个估算值
  // 注：latitude 和 altitude 参数在简化模型中未使用，但在完整模型中会用到
  
  // 简化的线性估算（仅用于演示）
  // 实际应用中需要完整的磁偏角模型
  const declination = Math.tan(longitude * Math.PI / 180) * 10;
  
  return declination;
}

/**
 * 计算两点之间的距离（Haversine公式）
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 计算方位角（从一个点到另一个点）
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * 将速度从米/秒转换为指定单位
 */
export function convertSpeed(
  speedMs: number,
  unit: 'ms' | 'kmh' | 'mph' | 'knots'
): number {
  switch (unit) {
    case 'kmh':
      return speedMs * 3.6;
    case 'mph':
      return speedMs * 2.237;
    case 'knots':
      return speedMs * 1.944;
    default:
      return speedMs;
  }
}

/**
 * 将距离从米转换为指定单位
 */
export function convertDistance(
  distanceM: number,
  unit: 'm' | 'ft'
): number {
  return unit === 'ft' ? distanceM * 3.281 : distanceM;
}

/**
 * 将加速度从 m/s² 转换为指定单位
 */
export function convertAcceleration(
  accelerationMs2: number,
  unit: 'ms2' | 'g'
): number {
  return unit === 'g' ? accelerationMs2 / 9.80665 : accelerationMs2;
}

/**
 * 获取加速度单位标签
 */
export function getAccelerationUnitLabel(unit: 'ms2' | 'g'): string {
  return unit === 'g' ? 'g' : 'm/s²';
}

/**
 * 格式化坐标（所有格式）
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  utmConverter: (lat: number, lon: number) => { zone: string; easting: string; northing: string },
  mgrsConverter: (lat: number, lon: number) => string
): CoordinateFormats {
  return {
    dd: {
      latitude: formatDD(latitude),
      longitude: formatDD(longitude)
    },
    dms: {
      latitude: decimalToDMS(latitude, true),
      longitude: decimalToDMS(longitude, false)
    },
    utm: utmConverter(latitude, longitude),
    mgrs: mgrsConverter(latitude, longitude),
    plusCode: '' // Plus Code 需要额外的库支持
  };
}

/**
 * 获取速度单位标签
 */
export function getSpeedUnitLabel(unit: 'ms' | 'kmh' | 'mph' | 'knots'): string {
  const labels = {
    ms: 'm/s',
    kmh: 'km/h',
    mph: 'mph',
    knots: 'kn'
  };
  return labels[unit];
}

/**
 * 获取距离单位标签
 */
export function getDistanceUnitLabel(unit: 'm' | 'ft'): string {
  return unit === 'm' ? '米' : '英尺';
}