/**
 * @file constants.ts
 * @description Store 相关常量定义
 * @author IOBS Team
 * @date 2024-01-01
 */

export const BED_JOINT_MAPPING_MODE = (import.meta.env.VITE_BED_JOINT_MAPPING_MODE === 'legacy' ? 'legacy' : 'spec') as 'legacy' | 'spec';

export const HEIGHT_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_front_back_joint' : 'bed_height_joint';

export const FRONT_BACK_MOVE_JOINT = BED_JOINT_MAPPING_MODE === 'legacy' ? 'bed_height_joint' : 'bed_front_back_joint';

export const BED_CONTROL_DIRECTION_MAP: Record<string, { speed: number; axis: Record<'up' | 'down' | 'left' | 'right', 1 | -1> }> = {
  bed_height_joint: { speed: 400, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_tilt_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_lateral_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_front_back_joint: { speed: 300, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_panel_back_joint: { speed: 10, axis: { up: 1, down: -1, left: -1, right: 1 } },
  bed_panel_left_leg_joint: { speed: 10, axis: { up: -1, down: 1, left: -1, right: 1 } },
  bed_panel_right_leg_joint: { speed: 10, axis: { up: -1, down: 1, left: -1, right: 1 } },
};

export const IGNORE_BACKEND_AFTER_COMMAND_MS = 800;

export const AWAITING_BACKEND_TIMEOUT_MS = 3000;

export const DIRECTION_LABEL_MAP: Record<'up' | 'down' | 'left' | 'right', string> = {
  up: '上升',
  down: '下降',
  left: '左移',
  right: '右移',
};
