/**
 * 机械限位与单位换算常量集中管理
 */

export const WORLD_TO_MM = 1000;
export const MM_TO_WORLD = 0.001;
export const DEG = Math.PI / 180;

// 手术床物理参数 (mm)
export const BED_HEIGHT_MIN = 500;
export const BED_HEIGHT_MAX = 1000;

// C 臂物理参数 (mm)
export const C_ARM_HEIGHT_MIN = 300;
export const C_ARM_HEIGHT_MAX = 400;

// 数值收口限制 (mm / degrees)
export const CLAMP_LIMITS = {
  POSITION: 20000,
  OFFSET: 10000,
  BED_TRENDELENBURG: 22,
  BED_LATERAL: 15,
  BED_BACKREST_ANGLE: 70,
  BED_LEG_ANGLE: 90,
  BED_HEAD_BOARD_ANGLE: 70,
  BED_LOWER_LEG_ANGLE: 90,
  BED_FRONT_BACK_POSITION: 200,
  C_ARM_ROTATION: 185,
  C_ARM_FRONT_BACK_ROTATION: 30,
  C_ARM_HEIGHT_JOINT: 400,
  C_ARM_FRONT_BACK_TRANSLATION: 350,
};

/**
 * 辅助收口函数
 */
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const clampBedTrendelenburg = (v: number) => clamp(v, -CLAMP_LIMITS.BED_TRENDELENBURG, CLAMP_LIMITS.BED_TRENDELENBURG);
export const clampBedLateral = (v: number) => clamp(v, -CLAMP_LIMITS.BED_LATERAL, CLAMP_LIMITS.BED_LATERAL);
export const clampBedBackrestAngle = (v: number) => clamp(v, -CLAMP_LIMITS.BED_BACKREST_ANGLE, CLAMP_LIMITS.BED_BACKREST_ANGLE);
export const clampBedLegAngle = (v: number) => clamp(v, -CLAMP_LIMITS.BED_LEG_ANGLE, CLAMP_LIMITS.BED_LEG_ANGLE);
export const clampBedHeadBoardAngle = (v: number) => clamp(v, -CLAMP_LIMITS.BED_HEAD_BOARD_ANGLE, CLAMP_LIMITS.BED_HEAD_BOARD_ANGLE);
export const clampBedLowerLegAngle = (v: number) => clamp(v, -CLAMP_LIMITS.BED_LOWER_LEG_ANGLE, CLAMP_LIMITS.BED_LOWER_LEG_ANGLE);
export const clampBedFrontBackPosition = (v: number) => clamp(v, -CLAMP_LIMITS.BED_FRONT_BACK_POSITION, CLAMP_LIMITS.BED_FRONT_BACK_POSITION);
export const clampHeight = (v: number) => clamp(v, BED_HEIGHT_MIN, BED_HEIGHT_MAX);
export const clampPosition = (v: number) => clamp(v, -CLAMP_LIMITS.POSITION, CLAMP_LIMITS.POSITION);
export const clampOffset = (v: number) => clamp(v, -CLAMP_LIMITS.OFFSET, CLAMP_LIMITS.OFFSET);
export const clampCArmRotation = (v: number) => clamp(v, -CLAMP_LIMITS.C_ARM_ROTATION, CLAMP_LIMITS.C_ARM_ROTATION);
export const clampCArmFrontBackRotation = (v: number) => clamp(v, -CLAMP_LIMITS.C_ARM_FRONT_BACK_ROTATION, CLAMP_LIMITS.C_ARM_FRONT_BACK_ROTATION);
export const clampCArmHeightJoint = (v: number) => clamp(v, C_ARM_HEIGHT_MIN, C_ARM_HEIGHT_MAX);
export const clampCArmFrontBackTranslation = (v: number) => clamp(v, 0, CLAMP_LIMITS.C_ARM_FRONT_BACK_TRANSLATION);
