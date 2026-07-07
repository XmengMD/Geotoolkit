/**
 * 设备方向事件扩展类型
 *
 * Capacitor Motion 的 `orientation` 事件在运行时就是原生的 `DeviceOrientationEvent`，
 * 但插件的 TypeScript 定义不完整（误标为 RotationRate），且未包含 iOS 的
 * `webkitCompassHeading`。这里扩展类型以便安全访问。
 *
 * 参考：
 * - MDN DeviceOrientationEvent: https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent
 * - MDN 方向与运动数据说明: https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Orientation_and_motion_data_explained
 */
export interface DeviceOrientationEventExtended extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

/** 罗盘读数来源 */
export type CompassSource = 'webkit' | 'absolute' | 'relative';

export interface CompassReading {
  /** 顺时针罗盘航向，范围 [0, 360)，正北为 0 */
  heading: number;
  /** 数据来源：iOS webkit、Android absolute、或相对 alpha */
  source: CompassSource;
  /** 精度（仅 iOS webkitCompassAccuracy 提供，单位：度） */
  accuracy: number | null;
}

/** 来源优先级，数字越大越可信 */
const SOURCE_PRIORITY: Record<CompassSource, number> = {
  webkit: 3,
  absolute: 2,
  relative: 1
};

/**
 * 将任意角度归一化到 [0, 360)
 */
export function normalizeHeading(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * 比较两个罗盘来源的可靠性。
 *
 * @returns 若 newSource 优于或等于 currentSource 则返回 true
 */
export function isSourceAtLeastAsGood(
  newSource: CompassSource,
  currentSource: CompassSource
): boolean {
  return SOURCE_PRIORITY[newSource] >= SOURCE_PRIORITY[currentSource];
}

/**
 * 从 DeviceOrientationEvent 解析罗盘航向。
 *
 * 官方约定：
 * - W3C / MDN 中 alpha 以正北为 0°，逆时针递增：
 *   0°=北、90°=西、180°=南、270°=东。
 * - 罗盘航向（heading）顺时针递增：
 *   0°=北、90°=东、180°=南、270°=西。
 * - 因此绝对 alpha 转航向公式：heading = (360 - alpha) % 360。
 * - iOS 的 `webkitCompassHeading` 已经是顺时针航向，优先使用。
 * - Android 推荐通过 `deviceorientationabsolute` 获取绝对 alpha，
 *   普通 `deviceorientation` 在多数 Android 浏览器上是相对 alpha。
 *
 * @param event 原生 DeviceOrientationEvent
 * @returns 罗盘读数；若无法解析则返回 null
 */
export function parseCompassHeading(
  event: DeviceOrientationEventExtended
): CompassReading | null {
  // iOS Safari：webkitCompassHeading 为已校准的顺时针航向（磁北/真北）。
  if (typeof event.webkitCompassHeading === 'number') {
    return {
      heading: normalizeHeading(event.webkitCompassHeading),
      source: 'webkit',
      accuracy: typeof event.webkitCompassAccuracy === 'number'
        ? event.webkitCompassAccuracy
        : null
    };
  }

  // Android / 其他浏览器：使用 alpha 并转换为顺时针航向。
  if (event.alpha !== null && event.alpha !== undefined) {
    return {
      heading: normalizeHeading((360 - event.alpha) % 360),
      source: event.absolute === true ? 'absolute' : 'relative',
      accuracy: null
    };
  }

  return null;
}

/**
 * 判断当前环境是否支持 `deviceorientationabsolute` 事件。
 * 该事件在 Android Chrome 上提供绝对方向（以正北为参考）。
 */
export function supportsAbsoluteOrientation(): boolean {
  return 'ondeviceorientationabsolute' in window;
}
