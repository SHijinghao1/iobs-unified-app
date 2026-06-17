/**
 * @file carmApi.ts
 * @description C臂API服务，负责C臂控制相关的API调用
 * @author IOBS Team
 * @date 2024-01-01
 */

import { fetchCArmMode, setCArmMode, setJointMove } from './iobsApi';

export const fetchNewSpaceCArmMode = fetchCArmMode;
export const setNewSpaceCArmMode = setCArmMode;
export const setNewSpaceCArmJointMove = async (joint: string, speed: number) => setJointMove('c_arm', joint, speed);
