/**
 * @file space.ts
 * @description 空间设备类型定义
 * @author IOBS Team
 * @date 2024-01-01
 */

export interface SpaceDeviceInfo {
  id: string;
  name: string;
  urdfPath: string;
  basePose: {
    position: [number, number, number];
    rpy: [number, number, number];
  };
  jointPositions: Record<string, number>;
  links: Record<string, {
    position: [number, number, number];
    rpy: [number, number, number];
  }>;
}
