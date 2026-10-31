<p align="center">
  <img src="https://img.shields.io/badge/yCODEX-Diagn%C3%B3stico%20de%20Hardware-00c8ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0yMCA0SDRjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoMTZjMS4xIDAgMi0uOSAyLTJWNmMwLTEuMS0uOS0yLTItMnptMCAxNEg0VjZoMTZ2MTJ6TTYgMTBoMnYySDZ6bTAgNGg4djJINnptMTAgMGgydjJoLTJ6bTAtNGgydjJoLTJ6bTAtNGg2djJoLTZ6Ii8+PC9zdmc+&logoColor=white" alt="yCODEX Badge"/>
</p>

<h1 align="center">
  yCODEX
</h1>

<p align="center">
  <strong>Plataforma web para diagnóstico de hardware e geração de fichas técnicas</strong>
</p>

<p align="center">
  <a href="https://ycodex.xyz">
    <img src="https://img.shields.io/badge/Live-ycodex.xyz-00c8ff?style=flat-square&logo=googlechrome&logoColor=white" alt="Site"/>
  </a>
  <img src="https://img.shields.io/badge/Hospedagem-GitHub%20Pages-181717?style=flat-square&logo=github" alt="GitHub Pages"/>
  <img src="https://img.shields.io/badge/Frameworks-Nenhum-333?style=flat-square" alt="Zero frameworks"/>
  <img src="https://img.shields.io/badge/Build-Nenhum-333?style=flat-square" alt="Zero build"/>
  <img src="https://img.shields.io/badge/3D-Three.js%20r128-049EF4?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js"/>
</p>

---

## O que é

**yCODEX** é uma ferramenta interna para assistências técnicas de computadores. Ela centraliza todo o fluxo de trabalho do técnico em uma única página:

1. **Roda um comando no terminal** do cliente e a ficha preenche sozinha
2. **Testa todos os componentes** de hardware no navegador
3. **Imprime ou envia** o relatório completo

Sem instalação, sem cadastro, sem frameworks. Abre o site e trabalha.

---

## Funcionalidades

| Aba | Descrição |
|---|---|
| **Tester** | Wizard sequencial de 5 etapas: teclado (com numpad), mouse, touchpad (cobertura + rolagem + pinça), microfone, webcam e áudio (sweep 20Hz–20kHz) |
| **Ficha Técnica** | Formulário auto-preenchido via script de terminal. Campos: marca, modelo, serial, SO, CPU, RAM, HD, teclado, tela, áudio, touchpad, USB, USB-C, leitor de cartão |
| **Preview** | Espelho em tempo real dos resultados, formatado como relatório profissional com badges OK/Pendente e stamp de aprovação |
| **Screen Test** | Cores sólidas em fullscreen para detecção de pixel morto |
| **Commands** | Lista de comandos copiáveis (ativador Windows, info CPU Mac, instaladores) |
| **Downloads** | Links diretos para ferramentas úteis |

### Extras

- **Modo claro/escuro** com toggle (escuro padrão)
- **Fundo animado** com partículas 3D via Three.js (shader Perlin wave), toggle on/off
- **Zoom via lupa** arrastável (bypass do bloqueio Ctrl+/-)
- **Preloader** animado com coelho ASCII
- **Sincronização entre abas** via BroadcastChannel
- **Banco de modelos Mac** (macs.json) — identifica automaticamente MacBooks até M5/M6

---

## Como usar a Ficha Técnica

O técnico roda **um único comando** no terminal do computador do cliente:

**macOS / Linux:**
```bash
curl -sL ycodex.xyz/f | sh
```

**Windows (PowerShell):**
```powershell
irm ycodex.xyz/f | iex
```

O script coleta automaticamente as informações de hardware e preenche a ficha no site.

---

## Estrutura do Projeto

```
ycodex/
├── index.html           # Estrutura HTML principal
├── css/
│   └── style.css        # Todos os estilos (~1750 linhas)
├── js/
│   ├── main.js          # Lógica principal e navegação
│   ├── wizard.js        # Wizard de testes (5 etapas)
│   ├── gate.js          # Trava de validação (testes + técnico)
│   ├── ficha.js         # Ficha técnica e auto-preenchimento
│   ├── preview.js       # Preview em tempo real
│   ├── touchpad.js      # Teste de touchpad
│   ├── screentest.js    # Teste de tela (pixel morto)
│   ├── noise.js         # Partículas 3D (Three.js)
│   ├── noise-worker.js  # Web Worker para noise
│   ├── theme.js         # Toggle claro/escuro
│   ├── zoom.js          # Lupa de zoom
│   └── preloader.js     # Preloader animado
├── assets/
│   ├── teclado.png      # Ícone do teclado
│   ├── webcam.png       # Ícone da webcam
│   ├── microfone.png    # Ícone do microfone
│   ├── alto-falante.png # Ícone do alto-falante
│   └── touchpad.png     # Ícone do touchpad
├── f.html               # Script polyglot (sh + PowerShell)
├── macs.json            # Banco de modelos Mac
└── CNAME                # Domínio ycodex.xyz
```

---

## Stack

| Camada | Tecnologia |
|---|---|
| Markup | HTML5 puro |
| Estilos | CSS3 puro (variáveis CSS, grid, flexbox) |
| Scripts | JavaScript vanilla (padrão IIFE, módulos separados) |
| 3D | Three.js r128 (via CDN) |
| Hosting | GitHub Pages |
| Domínio | ycodex.xyz (CNAME) |

**Filosofia:** zero dependências, zero build, zero frameworks. Edita e faz push.

---

## Desenvolvimento

```bash
# Clone
git clone https://github.com/yC0D3X/ycodex.git
cd ycodex

# Sirva localmente (qualquer server estático serve)
npx serve .
# ou
python -m http.server 8000
```

Abra `http://localhost:8000` e pronto.

---

## Licença

Uso interno. Todos os direitos reservados.

---

<p align="center">
  Feito com ☕ por <strong>Higor</strong> para quem conserta computadores de verdade.
</p>
