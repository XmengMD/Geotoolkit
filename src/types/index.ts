import type { CompassSource } from '@/utils/orientation';

// 位置信息类型
export interface PositionData {
  // 经纬度（十进制度数）
  latitude: number;
  longitude: number;
  // 海拔（米）
  altitude: number | null;
  // 精度（米）
  accuracy: number | null;
  // 海拔精度（米）
  altitudeAccuracy: number | null;
  // 方向（度，正北为0）
  heading: number | null;
  // 速度（米/秒）
  speed: number | null;
  // 时间戳
  timestamp: number;
}

// 坐标格式转换结果
export interface CoordinateFormats {
  // 十进制度数 (DD)
  dd: {
    latitude: string;
    longitude: string;
  };
  // 度分秒 (DMS)
  dms: {
    latitude: string;
    longitude: string;
  };
  // UTM
  utm: {
    zone: string;
    easting: string;
    northing: string;
  };
  // MGRS
  mgrs: string;
  // Plus Code (Open Location Code)
  plusCode: string;
}

// 运动信息类型
export interface MotionData {
  // 速度（米/秒）
  speed: number | null;
  // 速度（km/h）
  speedKmh: number | null;
  // 方向（度）
  heading: number | null;
  // 方向来源
  headingSource: CompassSource | null;
  // 海拔（米）
  altitude: number | null;
  // 垂直速度（米/秒）
  verticalSpeed: number | null;
  // 加速度（m/s²）
  acceleration: {
    x: number;
    y: number;
    z: number;
    magnitude: number;
  } | null;
  // 时间戳
  timestamp: number;
}

// GPS卫星信息
export interface SatelliteInfo {
  // 卫星PRN号
  prn: number;
  // 信噪比（dB-Hz）
  snr: number | null;
  // 仰角（度）
  elevation: number | null;
  // 方位角（度）
  azimuth: number | null;
  // 是否用于定位
  usedInFix: boolean;
  // 星座类型
  constellation: 'GPS' | 'GLONASS' | 'Galileo' | 'BeiDou' | 'QZSS' | 'Unknown';
}

// GPS详细信息
export interface GPSDetails {
  // 卫星列表
  satellites: SatelliteInfo[];
  // 用于定位的卫星数
  satellitesUsed: number;
  // 可见卫星数
  satellitesVisible: number;
  // 精度因子
  dop: {
    pdop: number | null; // 位置精度因子
    hdop: number | null; // 水平精度因子
    vdop: number | null; // 垂直精度因子
  };
  // 定位类型
  fixType: 'None' | '2D' | '3D' | 'DGPS' | 'RTK' | 'Unknown';
  // 时间戳
  timestamp: number;
}

// WiFi信号信息
export interface WiFiInfo {
  // SSID
  ssid: string;
  // BSSID (MAC地址)
  bssid: string;
  // 信号强度（dBm）
  rssi: number;
  // 频率（MHz）
  frequency: number;
  // 信道
  channel: number;
  // 安全类型
  security: string;
  // 时间戳
  timestamp: number;
}

// 网络延迟信息
export interface NetworkLatency {
  // 是否在线
  isOnline: boolean;
  // 连接类型
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  // 延迟（毫秒）
  latency: number | null;
  // 丢包率（%）
  packetLoss: number | null;
  // 时间戳
  timestamp: number;
}

// 传感器数据
export interface SensorData {
  // 加速度计
  accelerometer: {
    x: number;
    y: number;
    z: number;
  } | null;
  // 陀螺仪
  gyroscope: {
    x: number; // 角速度（rad/s）
    y: number;
    z: number;
  } | null;
  // 磁力计
  magnetometer: {
    x: number; // 磁场强度（μT）
    y: number;
    z: number;
  } | null;
  // 罗盘方向（度）
  compass: number | null;
  // 罗盘方向来源
  compassSource: CompassSource | null;
  // 磁偏角（度）
  magneticDeclination: number | null;
  // 时间戳
  timestamp: number;
}

// 图表数据点
export interface ChartDataPoint {
  value: number;
  timestamp: number;
}

// 图表时间范围选项
export type ChartTimeRange = '30s' | '1m' | '5m';

// 应用设置
export interface AppSettings {
  // 主题
  theme: 'dark' | 'light' | 'system';
  // 图表时间范围
  chartTimeRange: ChartTimeRange;
  // 刷新频率（毫秒）
  refreshInterval: number;
  // 坐标显示格式
  coordinateFormat: 'dd' | 'dms' | 'utm' | 'mgrs' | 'pluscode';
  // 速度单位
  speedUnit: 'ms' | 'kmh' | 'mph' | 'knots';
  // 距离单位
  distanceUnit: 'm' | 'ft';
  // 加速度单位
  accelerationUnit: 'ms2' | 'g';
  // 是否显示已启用的模块
  enabledModules: {
    position: boolean;
    motion: boolean;
    signal: boolean;
    sensor: boolean;
  };
}

// 模块激活状态
export interface ModuleActivation {
  position: boolean;
  motion: boolean;
  signal: boolean;
  sensor: boolean;
}