/**
 * @file agvApi.ts
 * @description AGV小车API服务，负责AGV控制相关的API调用
 * @author IOBS Team
 * @date 2024-01-01
 */

import { setJointMove } from './iobsApi';

export const AGV_COMMANDS = {
  Stop: 'Stop',
  Go_Back: 'Go_Back',
  Go_Forward: 'Go_Forward',
  Go_Left: 'Go_Left',
  Go_Right: 'Go_Right',
  Turn_Left: 'Turn_Left',
  Turn_Right: 'Turn_Right',
  Lift_Up: 'Lift_Up',
  Lift_Down: 'Lift_Down',
  AutoLocation: 'AutoLocation'
} as const;

export type AGVCommand = typeof AGV_COMMANDS[keyof typeof AGV_COMMANDS];

export const setNewSpaceAGVMove = async (command: AGVCommand, speed: number = 40) => {
  return setJointMove('agv', command, speed);
};