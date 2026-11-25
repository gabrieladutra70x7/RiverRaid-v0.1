const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos do HUD
const p1Info = document.getElementById('p1-info');
const p2Info = document.getElementById('p2-info');
const statusDiv = document.getElementById('status');

// Cópia local dos dados que vêm do servidor
let gameState = {
  players: {},
  obstacles: [],
  fuel: { x: 0, y: 0, width: 30, height: 40 }
};

// Aviso caso a sala já tenha 2 pessoas
socket.on('roomFull', (msg) => {
  alert(msg);
  statusDiv.innerText = 'SALA CHEIA';
});

// Recebe o estado oficial do servidor
socket.on('stateUpdate', (serverState) => {
  gameState = serverState;
  atualizarPlacar();
});

// TODO 7: Capture as teclas (ArrowLeft / ArrowRight ou A / D)
// e envie para o servidor usando socket.emit('playerMove', { direction: ... })
window.addEventListener('keydown', (e) => {
  if(e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A'){
    socket.emit('playerMove', {direction: 'left'});
  }else if(e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D'){
    socket.emit('playerMove', {direction: 'right'});
  }
});

function atualizarPlacar() {
  const lista = Object.values(gameState.players);
  statusDiv.innerText = lista.length < 2 ? 'Aguardando 2º piloto...' : 'CORRIDA EM ANDAMENTO!';

  // Atualiza texto dos jogadores no topo
  p1Info.innerText = 'Jogador 1: Aguardando...';
  p2Info.innerText = 'Jogador 2: Aguardando...';

  lista.forEach((p) => {
    const texto = `Piloto ${p.number}: ${p.score} pts ${p.alive ? '' : '(BATEU!)'}`;
    if (p.number === 1) p1Info.innerText = texto;
    if (p.number === 2) p2Info.innerText = texto;
  });
}

// Loop de Renderização (60 FPS no navegador)
function render() {
  // 1. Limpa a tela
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Desenha as margens verdes do rio (Esquerda e Direita)
  ctx.fillStyle = '#2b9348';
  ctx.fillRect(0, 0, 150, canvas.height);   // Margem esquerda
  ctx.fillRect(650, 0, 150, canvas.height); // Margem direita

  // 3. Desenha o Posto de Combustível (Rosa/Branco)
  const f = gameState.fuel;
  ctx.fillStyle = '#ff006e';
  ctx.fillRect(f.x, f.y, f.width, f.height);

  // TODO 8: Percorra o array 'gameState.obstacles' e desenhe cada obstáculo
  // Dica: Use ctx.fillStyle = '#333' e ctx.fillRect(...)
    ctx.fillStyle = '#333';

    for(let i = 0; i < gameState.obstacles.length; i++){
        const obs = gameState.obstacles[i];
    
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }


  // TODO 9: Percorra 'gameState.players' (for...in ou Object.values) e desenhe cada avião
  // Se p.alive for false, você pode desenhar ele cinza ou não desenhar!
  for(const id in gameState.players){
    const p = gameState.players[id];

        ctx.fillStyle = p.alive ? p.color: '#888';
        ctx.fillRect(p.x, p.y, p.width, p.height);

    }

  requestAnimationFrame(render);
}

// Inicia o loop visual
render();