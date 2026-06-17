/**
 * @file bedApi.ts
 * @description 床控API服务，负责手术床控制相关的API调用
 * @author IOBS Team
 * @date 2024-01-01
 */

import { setJointMove } from './iobsApi';

export const setNewSpaceBedJointMove = async (joint: string, speed: number) => setJointMove('surgery_bed', joint, speed);
