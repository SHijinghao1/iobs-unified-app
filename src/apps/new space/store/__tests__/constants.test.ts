import { describe, it, expect } from 'vitest';
import {
  BED_JOINT_MAPPING_MODE,
  HEIGHT_MOVE_JOINT,
  FRONT_BACK_MOVE_JOINT,
  BED_CONTROL_DIRECTION_MAP,
  IGNORE_BACKEND_AFTER_COMMAND_MS,
  DIRECTION_LABEL_MAP,
} from '../constants';

describe('constants', () => {
  it('HEIGHT_MOVE_JOINT and FRONT_BACK_MOVE_JOINT should be different', () => {
    expect(HEIGHT_MOVE_JOINT).not.toBe(FRONT_BACK_MOVE_JOINT);
  });

  it('HEIGHT_MOVE_JOINT should be a valid bed joint name', () => {
    expect(['bed_height_joint', 'bed_front_back_joint']).toContain(HEIGHT_MOVE_JOINT);
  });

  it('FRONT_BACK_MOVE_JOINT should be a valid bed joint name', () => {
    expect(['bed_height_joint', 'bed_front_back_joint']).toContain(FRONT_BACK_MOVE_JOINT);
  });

  it('BED_CONTROL_DIRECTION_MAP should have all expected joints', () => {
    const expectedJoints = [
      'bed_height_joint',
      'bed_tilt_joint',
      'bed_lateral_joint',
      'bed_front_back_joint',
      'bed_panel_back_joint',
      'bed_panel_left_leg_joint',
      'bed_panel_right_leg_joint',
    ];

    for (const joint of expectedJoints) {
      expect(BED_CONTROL_DIRECTION_MAP).toHaveProperty(joint);
    }
  });

  it('each joint config should have speed and axis with all directions', () => {
    const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];

    for (const [, config] of Object.entries(BED_CONTROL_DIRECTION_MAP)) {
      expect(typeof config.speed).toBe('number');
      expect(config.speed).toBeGreaterThan(0);

      for (const dir of directions) {
        expect(config.axis).toHaveProperty(dir);
        expect([1, -1]).toContain(config.axis[dir]);
      }
    }
  });

  it('IGNORE_BACKEND_AFTER_COMMAND_MS should be a positive number', () => {
    expect(IGNORE_BACKEND_AFTER_COMMAND_MS).toBeGreaterThan(0);
    expect(typeof IGNORE_BACKEND_AFTER_COMMAND_MS).toBe('number');
  });

  it('DIRECTION_LABEL_MAP should have all four directions', () => {
    expect(DIRECTION_LABEL_MAP).toHaveProperty('up');
    expect(DIRECTION_LABEL_MAP).toHaveProperty('down');
    expect(DIRECTION_LABEL_MAP).toHaveProperty('left');
    expect(DIRECTION_LABEL_MAP).toHaveProperty('right');

    for (const label of Object.values(DIRECTION_LABEL_MAP)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('BED_JOINT_MAPPING_MODE should be legacy or spec', () => {
    expect(['legacy', 'spec']).toContain(BED_JOINT_MAPPING_MODE);
  });
});
