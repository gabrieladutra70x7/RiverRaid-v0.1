const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Estado oficial do jogo (Fonte da Verdade)
let players = {};
let obstacles = []; // Inimigos (navios/ilhas) que descem o rio
let fuel = { x: 400, y: 100, width: 30, height: 40 }; // Posto de combustível

// Limites do rio (margens verdes nas laterais)
const RIVER_LEFT = 150;
const RIVER_RIGHT = 650;

io.on('connection', (socket) => {
  // 1. REGRA DE LIMITE: Máximo de 2 jogadores
  const totalPlayers = Object.keys(players).length;
  if (totalPlayers >= 2) {
    socket.emit('roomFull', 'A corrida já tem 2 jogadores! Tente mais tarde.');
    socket.disconnect();
    return;
  }

  console.log(`Piloto entrou: ${socket.id}`);

  // Define se é o Jogador 1 (Amarelo) ou Jogador 2 (Vermelho)
  const isPlayer1 = totalPlayers === 0;

  players[socket.id] = {
    id: socket.id,
    number: isPlayer1 ? 1 : 2,
    x: isPlayer1 ? 300 : 500,
    y: 500,
    width: 30,
    height: 30,
    color: isPlayer1 ? '#ffd166' : '#ef476f',
    score: 0,
    alive: true
  };

  // TODO 2: Envie o estado atual para quem acabou de entrar e avise todos os jogadores
     io.emit('stateUpdate', { players, obstacles, fuel });

  // Escuta o movimento do jogador
  socket.on('playerMove', (data) => {
    const p = players[socket.id];
    if (!p || !p.alive) return;

    const speed = 15;

    // TODO 3: Atualize p.x baseado em data.direction ('left' ou 'right')
    if (data.direction === 'left') {
      p.x -= speed;
      if (p.x < RIVER_LEFT) p.x = RIVER_LEFT; // Trava na margem esquerda
    } else if (data.direction === 'right') {
      p.x += speed;
      if (p.x > RIVER_RIGHT - p.width) p.x = RIVER_RIGHT - p.width; // Trava na margem direita
    }

    io.emit('stateUpdate', { players, obstacles, fuel });
  });

  // Quando o jogador sai
  socket.on('disconnect', () => {
    console.log(`Piloto saiu: ${socket.id}`);
    delete players[socket.id];

    io.emit('playerDisconnected', socket.id)
    io.emit('stateUpdate', { players, obstacles, fuel });
  });
});

// Loop do Servidor (Faz o cenário andar e verifica colisões)
setInterval(() => {
  // Só roda o jogo se tiver pelo menos 1 jogador
  if (Object.keys(players).length === 0) return;

  // Faz o combustível descer o rio
  fuel.y += 5;
  if (fuel.y > 600) {
    fuel.y = -40;
    fuel.x = Math.floor(Math.random() * (RIVER_RIGHT - RIVER_LEFT - fuel.width)) + RIVER_LEFT;
  }

  // Cria obstáculos aleatórios de vez em quando
  if (Math.random() < 0.03) {
    obstacles.push({
      x: Math.floor(Math.random() * (RIVER_RIGHT - RIVER_LEFT - 40)) + RIVER_LEFT,
      y: -40,
      width: 40,
      height: 25
    });
  }

  // Move os obstáculos para baixo e verifica colisão com os jogadores
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].y += 6;

    // TODO 5: Verifique colisão (AABB) entre obstacles[i] e cada jogador em 'players'.
    // Se bater, mude p.alive = false!
    const obs = obstacles[i];

    for (const id in players){
        const p = players[id];

        if(!p.alive) continue;
    
        const colisao = (
            p.x < obs.x + obs.width &&
            p.x + p.width > obs.x &&
            p.y < obs.y + obs.height &&
            p.y + p.height > obs.y  
        );

        if(colisao){
            p.alive = false
             io.emit('playerDied', id);
        }
    }

    // Remove obstáculo que saiu da tela
    if (obstacles[i].y > 600) {
      obstacles.splice(i, 1);
    }
  }

  // TODO 6: Verifique se algum jogador colidiu com o 'fuel'.
  // Se pegar, some +10 em p.score e reposicione fuel.y = -40!
    for(const id in players){
        const p = players[id];

        if(!p.alive) continue;

        const abasteceu = (
            p.x < fuel.x + fuel.width &&
            p.x + p.width > fuel.x &&
            p.y < fuel.y + fuel.height &&
            p.y + p.height > fuel.y
        );

        if(abasteceu){
            p.score += 10;
            fuel.y = -40 ;
            
                //spawn aleatorio do fuel
                fuel.x = Math.floor(Math.random() * 400);
        
            break; //impede que dois players peguem o mesmo fuel
        }
    }

  // Envia tudo atualizado para as telas
  io.emit('stateUpdate', { players, obstacles, fuel });
}, 1000 / 30); // 30 quadros por segundo (Tick Rate)

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor River Raid rodando na porta ${PORT}`);
});