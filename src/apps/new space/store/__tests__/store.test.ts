import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/iobsApi', () => ({
  sendEmergencyStop: vi.fn().mockResolvedValue(undefined),
  fetchFullSpaceData: vi.fn().mockResolvedValue(null),
  fetchSpaceDevices: vi.fn().mockResolvedValue(null),
  syncDeviceState: vi.fn().mockResolvedValue(undefined),
  fetchDeviceState: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/presetApi', () => ({
  fetchNewSpaceBedStatusList: vi.fn().mockResolvedValue(null),
  applyNewSpaceBedStatusById: vi.fn().mockResolvedValue({ ok: true }),
  fetchNewSpaceDemoList: vi.fn().mockResolvedValue(null),
  applyNewSpaceDemoById: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../services/carmApi', () => ({
  fetchNewSpaceCArmMode: vi.fn().mockResolvedValue(null),
  setNewSpaceCArmMode: vi.fn().mockResolvedValue(true),
  setNewSpaceCArmJointMove: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../services/bedApi', () => ({
  setNewSpaceBedJointMove: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../../store/backendSync', () => ({
  startBackendPolling: vi.fn(),
  stopBackendPolling: vi.fn(),
}));

vi.mock('../../store/mappers', () => ({
  mapBackendBedToScene: vi.fn((data) => data ?? {}),
  mapBackendCArmToScene: vi.fn((data) => data ?? {}),
  mapSceneBedToBackend: vi.fn((data) => data),
  mapSceneCArmToBackend: vi.fn((data) => data),
}));

vi.mock('../../utils/spaceDeviceBindings', () => ({
  isLikelyBedDevice: vi.fn(() => false),
  isLikelyCArmDevice: vi.fn(() => false),
  listCArmDeviceCandidates: vi.fn(() => []),
  resolveCArmBinding: vi.fn(() => null),
}));

import { useNewSpaceStore } from '../../store';

describe('useNewSpaceStore', () => {
  beforeEach(() => {
    const { getState, setState } = useNewSpaceStore;
    setState({
      toasts: [],
      selectedTelemetryModuleId: null,
      cArmRotation: 0,
      cArmFrontBackRotation: 0,
      cArmHeightJoint: 350,
      frontBackTranslation: 150,
      bedInteractionState: 'IDLE',
      bedInteractingPart: null,
      cArmInteractionState: 'IDLE',
      cArmInteractingPart: null,
      lastUpdateSource: 'ui',
      emergencyStopping: false,
      sceneLocked: false,
      isMeasuring: false,
      isAnnotating: false,
      showBedModelInScene: true,
      showCArmModelInScene: true,
    });
  });

  describe('pushToast', () => {
    it('should add a toast', () => {
      const { getState, setState } = useNewSpaceStore;
      getState().pushToast('test message', 'info');

      expect(getState().toasts).toHaveLength(1);
      expect(getState().toasts[0].message).toBe('test message');
      expect(getState().toasts[0].type).toBe('info');
    });

    it('should default to info type', () => {
      const { getState } = useNewSpaceStore;
      getState().pushToast('test');

      expect(getState().toasts[0].type).toBe('info');
    });

    it('should keep at most 4 toasts', () => {
      const { getState } = useNewSpaceStore;
      for (let i = 0; i < 6; i++) {
        getState().pushToast(`msg ${i}`);
      }

      expect(getState().toasts).toHaveLength(4);
      expect(getState().toasts[0].message).toBe('msg 2');
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      const { getState } = useNewSpaceStore;
      getState().pushToast('keep');
      getState().pushToast('remove');

      const removeId = getState().toasts[1].id;
      getState().removeToast(removeId);

      expect(getState().toasts).toHaveLength(1);
      expect(getState().toasts[0].message).toBe('keep');
    });
  });

  describe('setSelectedTelemetryModuleId', () => {
    it('should set the selected telemetry module id', () => {
      const { getState } = useNewSpaceStore;
      getState().setSelectedTelemetryModuleId('bed_height_joint');

      expect(getState().selectedTelemetryModuleId).toBe('bed_height_joint');
    });

    it('should set to null', () => {
      const { getState } = useNewSpaceStore;
      getState().setSelectedTelemetryModuleId('bed_height_joint');
      getState().setSelectedTelemetryModuleId(null);

      expect(getState().selectedTelemetryModuleId).toBeNull();
    });
  });

  describe('requireSelectedTelemetryModule', () => {
    it('should return null and push warning toast when no module selected', () => {
      const { getState } = useNewSpaceStore;
      const result = getState().requireSelectedTelemetryModule();

      expect(result).toBeNull();
      expect(getState().toasts).toHaveLength(1);
      expect(getState().toasts[0].type).toBe('warning');
    });

    it('should return the selected module id when set', () => {
      const { getState } = useNewSpaceStore;
      getState().setSelectedTelemetryModuleId('bed_tilt_joint');

      const result = getState().requireSelectedTelemetryModule();
      expect(result).toBe('bed_tilt_joint');
    });
  });

  describe('setCArmRotation', () => {
    it('should update cArmRotation and cArm state', () => {
      const { getState } = useNewSpaceStore;
      getState().setCArmRotation(45);

      expect(getState().cArmRotation).toBe(45);
      expect(getState().cArm.cArmRotation).toBe(45);
    });
  });

  describe('setCArmHeightJoint', () => {
    it('should update cArmHeightJoint and cArm state', () => {
      const { getState } = useNewSpaceStore;
      getState().setCArmHeightJoint(400);

      expect(getState().cArmHeightJoint).toBe(400);
      expect(getState().cArm.cArmHeightJoint).toBe(400);
    });
  });

  describe('resetLocalCArmPose', () => {
    it('should reset all CArm values to defaults', () => {
      const { getState } = useNewSpaceStore;
      getState().setCArmRotation(90);
      getState().setCArmHeightJoint(500);
      getState().setCArmFrontBackRotation(30);
      getState().setCArmFrontBackTranslation(200);

      getState().resetLocalCArmPose();

      expect(getState().cArmRotation).toBe(0);
      expect(getState().cArmHeightJoint).toBe(350);
      expect(getState().cArmFrontBackRotation).toBe(0);
      expect(getState().frontBackTranslation).toBe(150);
    });
  });

  describe('toggleMeasuring', () => {
    it('should toggle isMeasuring', () => {
      const { getState } = useNewSpaceStore;
      expect(getState().isMeasuring).toBe(false);

      getState().toggleMeasuring();
      expect(getState().isMeasuring).toBe(true);

      getState().toggleMeasuring();
      expect(getState().isMeasuring).toBe(false);
    });

    it('should disable annotating when measuring is enabled', () => {
      const { getState } = useNewSpaceStore;
      getState().toggleAnnotating();
      expect(getState().isAnnotating).toBe(true);

      getState().toggleMeasuring();
      expect(getState().isMeasuring).toBe(true);
      expect(getState().isAnnotating).toBe(false);
    });
  });

  describe('toggleAnnotating', () => {
    it('should toggle isAnnotating', () => {
      const { getState } = useNewSpaceStore;
      expect(getState().isAnnotating).toBe(false);

      getState().toggleAnnotating();
      expect(getState().isAnnotating).toBe(true);
    });

    it('should disable measuring when annotating is enabled', () => {
      const { getState } = useNewSpaceStore;
      getState().toggleMeasuring();
      expect(getState().isMeasuring).toBe(true);

      getState().toggleAnnotating();
      expect(getState().isAnnotating).toBe(true);
      expect(getState().isMeasuring).toBe(false);
    });
  });

  describe('setSceneLocked', () => {
    it('should set scene locked state', () => {
      const { getState } = useNewSpaceStore;
      getState().setSceneLocked(true);
      expect(getState().sceneLocked).toBe(true);

      getState().setSceneLocked(false);
      expect(getState().sceneLocked).toBe(false);
    });
  });

  describe('setShowBedModelInScene', () => {
    it('should toggle bed model visibility', () => {
      const { getState } = useNewSpaceStore;
      expect(getState().showBedModelInScene).toBe(true);

      getState().setShowBedModelInScene(false);
      expect(getState().showBedModelInScene).toBe(false);
    });
  });

  describe('setBedJointSpeed', () => {
    it('should update joint speed', () => {
      const { getState } = useNewSpaceStore;
      getState().setBedJointSpeed('bed_height_joint', 500);

      expect(getState().bedJointSpeeds['bed_height_joint']).toBe(500);
    });
  });

  describe('updateCameraPosition', () => {
    it('should update camera position and target', () => {
      const { getState } = useNewSpaceStore;
      getState().updateCameraPosition([1, 2, 3], [4, 5, 6]);

      expect(getState().cameraPosition).toEqual([1, 2, 3]);
      expect(getState().cameraTarget).toEqual([4, 5, 6]);
    });
  });

  describe('setBedInteractionState', () => {
    it('should update bed interaction state', () => {
      const { getState } = useNewSpaceStore;
      getState().setBedInteractionState('USER_INTERACTING');

      expect(getState().bedInteractionState).toBe('USER_INTERACTING');
    });
  });
});
