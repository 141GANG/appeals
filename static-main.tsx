import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppealApp from './app/appeal-app';
import './app/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Не найден корневой элемент приложения.');

createRoot(root).render(
  <StrictMode>
    <AppealApp signedIn={false} signInUrl="#" staticMode />
  </StrictMode>,
);
