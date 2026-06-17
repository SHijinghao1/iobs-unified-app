// Web Audio API 蜂鸣声生成器，用于告警提示
class AlarmSound {
  private audioCtx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playBeep(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioCtx) return;
    
    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime); // 音量 (Volume)
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(this.audioCtx.currentTime + duration);
  }

  // IEC 60601-1-8 风格的高优先级告警（3声蜂鸣，停顿，2声蜂鸣） (IEC 60601-1-8 style high priority alarm (3 beeps, pause, 2 beeps))
  public playHighPriorityAlarm() {
    this.init();
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    if (this.isPlaying) return;
    this.isPlaying = true;

    const pattern = () => {
      // 3声蜂鸣 (3 beeps)
      setTimeout(() => this.playBeep(800, 0.2, 'square'), 0);
      setTimeout(() => this.playBeep(800, 0.2, 'square'), 250);
      setTimeout(() => this.playBeep(800, 0.2, 'square'), 500);
      
      // 2声蜂鸣 (2 beeps)
      setTimeout(() => this.playBeep(800, 0.2, 'square'), 1000);
      setTimeout(() => this.playBeep(800, 0.2, 'square'), 1250);
    };

    pattern();
    this.intervalId = window.setInterval(pattern, 3000);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const alarmSound = new AlarmSound();
