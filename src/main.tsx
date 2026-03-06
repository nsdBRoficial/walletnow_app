import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Ponto de Entrada Principal (Entry Point)
 * 
 * Este é o primeiro arquivo JavaScript/TypeScript executado pelo navegador.
 * Ele é responsável por "montar" (renderizar) a nossa aplicação React 
 * dentro do elemento HTML que possui o ID 'root' (encontrado no index.html).
 */
createRoot(document.getElementById('root')!).render(
  // StrictMode: Uma ferramenta do React para destacar problemas potenciais na aplicação.
  // Ele ativa verificações e avisos adicionais apenas em modo de desenvolvimento.
  <StrictMode>
    {/* Renderiza o componente principal App, que contém todas as nossas rotas */}
    <App />
  </StrictMode>,
);
