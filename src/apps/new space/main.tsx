/**
 * @file main.tsx
 * @description 手术室应用入口文件
 * @author IOBS Team
 * @date 2024-01-01
 */

import { createRoot } from 'react-dom/client';

import App from './App.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <App />
);
