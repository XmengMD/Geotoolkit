/**
 * 节流函数
 *
 * 在 wait 毫秒内最多执行一次 func，适用于高频事件（如传感器事件）的显示层采样。
 *
 * @param func 要节流的函数
 * @param wait 最小执行间隔（毫秒）
 * @returns 节流后的函数
 */
export function throttle<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let lastTime = 0;

  return (...args: TArgs) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      func(...args);
    }
  };
}
