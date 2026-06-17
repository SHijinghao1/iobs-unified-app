import { useEffect } from 'react';
import { useStore } from '../store';

// 键盘快捷键：提供复位、截图和预设切换。

export const useKeyboardShortcuts = () => {
  const { resetPositions, applyPreset } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'r':
          resetPositions();
          break;

        case 's': {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const link = document.createElement('a');
            link.download = `screenshot-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
          }
          break;
        }

        case '1':
          applyPreset('standard');
          break;

        case '2':
          applyPreset('lateral');
          break;

        case '3':
          applyPreset('ap');
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetPositions, applyPreset]);
};
