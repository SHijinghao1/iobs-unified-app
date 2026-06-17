/**
 * 阈值过滤工具
 * 用于过滤后端数据中因电子干扰导致的小数点后两位微小变化
 */

/**
 * 数值变化阈值（小数点后一位精度）
 * 只有当数值变化超过 0.1 时才认为是有效变化
 */
const VALUE_CHANGE_THRESHOLD = 0.1;

/**
 * 检查数值是否有显著变化（超过阈值）
 * @param newValue 新值
 * @param oldValue 旧值
 * @returns 是否有显著变化
 */
export const hasSignificantChange = (
  newValue: number | undefined,
  oldValue: number | undefined
): boolean => {
  if (newValue === undefined) return false;
  if (oldValue === undefined) return true;
  return Math.abs(newValue - oldValue) >= VALUE_CHANGE_THRESHOLD;
};

/**
 * 应用阈值过滤，只返回有显著变化的值
 * @param newValue 新值
 * @param oldValue 旧值
 * @returns 如果有显著变化返回新值，否则返回旧值
 */
export const applyThresholdFilter = (
  newValue: number | undefined,
  oldValue: number | undefined
): number | undefined => {
  return hasSignificantChange(newValue, oldValue) ? newValue : oldValue;
};
