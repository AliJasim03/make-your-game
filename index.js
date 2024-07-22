const KEY_CODES = {
    RIGHT: 39,
    LEFT: 37,
    SPACE: 32,
    ESC: 27,
    ENTER: 'Enter',
    O: 'o',
    R: 'r',
    B: 'b',
    C: 'c',
};

const GAME_DIMENSIONS = {
    WIDTH: 800,
    HEIGHT: 600,
};

const life = document.getElementById('life');
const timerElement = document.getElementById('timer');
const pauseMenu = document.querySelector('.pause');
const $container = document.querySelector('.main');

// Animation frame global variable
let gameId = null;

const STATE = {
    xPos: 0,
    yPos: 0,
    moveLeft: false,
    moveRight: false,
    shoot: false,
    lasers: [],
    enemies: [],
    enemyLasers: [],
    spaceshipWidth: 50,
    enemyWidth: 50,
    cooldown: 0,
    enemyCooldown: 0,
    numberOfEnemies: 16,
    gameOver: false,
    gamePaused: false,
    gameStarted: false,
    gameOptions: false,
};

let score = 0;

// General functions
function setPosition($element, x, y) {
    $element.style.transform = `translate(${x}px, ${y}px)`;
}

function setSize($element, width) {
    $element.style.width = `${width}px`;
    $element.style.height = 'auto';
}

function bound(x) {
    if (x >= GAME_DIMENSIONS.WIDTH - STATE.spaceshipWidth) {
        STATE.xPos = GAME_DIMENSIONS.WIDTH - STATE.spaceshipWidth;
        return STATE.xPos;
    } else if (x <= 0) {
        STATE.xPos = 0;
        return STATE.xPos;
    } else {
        return x;
    }
}

function collideRect(rect1, rect2) {
    return !(rect2.left > rect1.right ||
        rect2.right < rect1.left ||
        rect2.top > rect1.bottom ||
        rect2.bottom < rect1.top);
}

let startTime = null;
let elapsedTime = 0;
let timeInterval = null;
let beforeStop = 0;

function startTimer() {
    startTime = Date.now();
    const updateTimer = function () {
        if (STATE.gamePaused) return; // Don't update the timer if the game is paused
        elapsedTime = Date.now() - startTime;
        displayTime(elapsedTime + beforeStop);
    };
    timeInterval = setInterval(updateTimer, 1000);
}

function pauseTimer() {
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
        beforeStop += elapsedTime;
    } else if (STATE.gameStarted) {
        startTimer();
    }
}

function resetTimer() {
    clearInterval(timeInterval);
    timeInterval = null;
    startTimer();
}

function displayTime(timeMillie) {
    const timeInSec = Math.floor(timeMillie / 1000);
    const sec = timeInSec % 60;
    const mins = Math.floor(timeInSec / 60);
    timerElement.textContent = `${mins}:${sec < 10 ? '0' : ''}${sec}`;
}

function togglePauseOn() {
    if (STATE.gameOver) return;

    STATE.gamePaused = true;

    if (STATE.gamePaused) {
        console.log('Game is PAUSED.');
        pauseTimer();
        document.removeEventListener('keydown', handleKeyPress);
        document.removeEventListener('keyup', handleKeyRelease);
        pauseMenu.style.display = 'block';
        cancelAnimationFrame(gameId);
    }
}

function togglePauseOff() {
    STATE.gamePaused = false;

    if (!STATE.gamePaused) {
        console.log('Game is UNPAUSED.');
        resetTimer();
        document.addEventListener('keydown', handleKeyPress);
        document.addEventListener('keyup', handleKeyRelease);
        pauseMenu.style.display = 'none';
        gameId = requestAnimationFrame(update);
    }
}

function createPlayer($container) {
    STATE.xPos = GAME_DIMENSIONS.WIDTH / 2;
    STATE.yPos = GAME_DIMENSIONS.HEIGHT - 50;
    const $player = document.createElement('img');
    $player.src = 'images/spaceship.png';
    $player.className = 'player';
    $container.appendChild($player);
    setPosition($player, STATE.xPos, STATE.yPos);
    setSize($player, STATE.spaceshipWidth);
}

function updatePlayer() {
    if (STATE.moveLeft) {
        STATE.xPos -= 3;
    }
    if (STATE.moveRight) {
        STATE.xPos += 3;
    }
    if (STATE.shoot && STATE.cooldown === 0) {
        createLaser($container, STATE.xPos - STATE.spaceshipWidth / 2, STATE.yPos);
        STATE.cooldown = 30;
    }
    const $player = document.querySelector('.player');
    setPosition($player, bound(STATE.xPos), STATE.yPos - 15);
    if (STATE.cooldown > 0) {
        STATE.cooldown -= 0.5;
    }
}

// Player Laser
function createLaser($container, x, y) {
    const $laser = document.createElement('img');
    $laser.src = 'images/laser.png';
    $laser.className = 'laser';
    $container.appendChild($laser);
    const laser = { x, y, $laser };
    STATE.lasers.push(laser);
    setPosition($laser, x, y);
}

function updateLaser($container) {
    const lasers = STATE.lasers;
    for (let i = 0; i < lasers.length; i++) {
        const laser = lasers[i];
        laser.y -= 2;
        if (laser.y < 0) {
            deleteLaser(lasers, laser, laser.$laser);
        }
        setPosition(laser.$laser, laser.x, laser.y);
        const laserRectangle = laser.$laser.getBoundingClientRect();
        const enemies = STATE.enemies;
        for (let j = 0; j < enemies.length; j++) {
            const enemy = enemies[j];
            const enemyRectangle = enemy.$enemy.getBoundingClientRect();
            if (collideRect(enemyRectangle, laserRectangle)) {
                deleteLaser(lasers, laser, laser.$laser);
                const index = enemies.indexOf(enemy);
                enemies.splice(index, 1);
                $container.removeChild(enemy.$enemy);
                score += 100;
            }
        }
    }
}

function deleteLaser(lasers, laser, $laser) {
    lasers.splice(lasers.indexOf(laser), 1);
    $container.removeChild($laser);
}

// Enemies
function createEnemy($container, x, y) {
    const $enemy = document.createElement('img');
    $enemy.src = 'images/ufo.png';
    $enemy.className = 'enemy';
    $container.appendChild($enemy);
    const enemyCooldown = Math.floor(Math.random() * 100);
    const enemy = { x, y, $enemy, enemyCooldown };
    STATE.enemies.push(enemy);
    setSize($enemy, STATE.enemyWidth);
    setPosition($enemy, x, y);
}

function updateEnemies($container) {
    const dx = Math.sin(Date.now() / 1000) * 40;
    const dy = Math.cos(Date.now() / 1000) * 30;
    const enemies = STATE.enemies;

    for (const enemy of enemies) {
        const a = enemy.x + dx;
        const b = enemy.y + dy;
        setPosition(enemy.$enemy, a, b);
        enemy.cooldown = Math.random(200, 500);
        if (enemy.enemyCooldown === 0 && !STATE.gameOver) {
            createEnemyLaser($container, a, b);
            enemy.enemyCooldown = Math.floor(Math.random() * 50) + 100;
        }
        enemy.enemyCooldown -= .5;
    }
}

function createEnemies($container) {
    for (let i = 0; i <= STATE.numberOfEnemies / 2; i++) {
        createEnemy($container, i * 80, 100);
    }
    for (let i = 0; i <= STATE.numberOfEnemies / 2; i++) {
        createEnemy($container, i * 80, 180);
    }
}

function createEnemyLaser($container, x, y) {
    const $enemyLaser = document.createElement('img');
    $enemyLaser.src = 'images/enemyLaser.png';
    $enemyLaser.className = 'enemyLaser';
    $container.appendChild($enemyLaser);
    const enemyLaser = { x, y, $enemyLaser };
    STATE.enemyLasers.push(enemyLaser);
    setPosition($enemyLaser, x, y);
}

function updateEnemyLaser() {
    const enemyLasers = STATE.enemyLasers;
    for (let i = 0; i < enemyLasers.length; i++) {
        const enemyLaser = enemyLasers[i];
        enemyLaser.y += .8;
        if (enemyLaser.y > GAME_DIMENSIONS.HEIGHT - 30) {
            deleteLaser(enemyLasers, enemyLaser, enemyLaser.$enemyLaser);
        }
        const enemyLaserRect = enemyLaser.$enemyLaser.getBoundingClientRect();
        const playerRect = document.querySelector('.player').getBoundingClientRect();
        if (collideRect(playerRect, enemyLaserRect)) {
            gameOver();
            const player = document.querySelector('.player');
            player.style.filter = 'grayscale(100%)';
        }
        setPosition(enemyLaser.$enemyLaser, enemyLaser.x + STATE.enemyWidth / 2, enemyLaser.y + 15);
    }
}

// Key Presses
function handleKeyPress(event) {
    if (STATE.gameOver) {
        return;
    }

    if (event.keyCode === KEY_CODES.RIGHT) {
        STATE.moveRight = true;
    } else if (event.keyCode === KEY_CODES.LEFT) {
        STATE.moveLeft = true;
    } else if (event.keyCode === KEY_CODES.SPACE) {
        STATE.shoot = true;
    } else if (event.keyCode === KEY_CODES.ESC && STATE.gameStarted) {
        togglePauseOn();
    }
}

// Key Releases
function handleKeyRelease(event) {
    if (event.keyCode === KEY_CODES.RIGHT) {
        STATE.moveRight = false;
    } else if (event.keyCode === KEY_CODES.LEFT) {
        STATE.moveLeft = false;
    } else if (event.keyCode === KEY_CODES.SPACE) {
        STATE.shoot = false;
    }
}

function updateScore(points) {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Points: ${points}`;
}

// Game Over
function gameOver() {
    STATE.gameOver = true;
    cancelAnimationFrame(gameId);
    document.removeEventListener('keyup', handleKeyRelease);
}

function openOptionMenu() {
    if (!STATE.gameOptions) {
        STATE.gameOptions = true;
        document.querySelector('.menu').style.display = 'none';
        document.querySelector('.options').style.display = 'block';
    }
}

// Main Update
function update() {
    updatePlayer();
    updateLaser($container);
    updateEnemies($container);
    updateEnemyLaser();

    gameId = requestAnimationFrame(update);
    updateScore(score);
    if (STATE.gameOver) {
        pauseTimer();
        life.textContent = 'Lives: 💔';
        document.querySelector('.lose').style.display = 'block';
    }
    if (STATE.enemies.length === 0) {
        pauseTimer();
        document.querySelector('.win').style.display = 'block';
    }
}

// Initialize Game
function init() {
    timerElement.style.display = 'inline';
    life.style.display = 'inline';
    life.textContent = 'Lives: ❤️';
    document.querySelector('.menu').style.display = 'none';
    createPlayer($container);
    createEnemies($container);
    STATE.gameStarted = true;
    startTimer();
    update();
}

// Event Listeners
window.addEventListener('keydown', handleKeyPress);
window.addEventListener('keyup', handleKeyRelease);

window.addEventListener('keydown', (e) => {
    if (e.key === KEY_CODES.ENTER && !STATE.gameOptions && !STATE.gameStarted) {
        init();
    } else if (e.key === KEY_CODES.O && !STATE.gameStarted) {
        openOptionMenu();
    } else if (e.key === KEY_CODES.ENTER && STATE.gameOptions) {
        STATE.gameOptions = false;
        document.querySelector('.menu').style.display = 'block';
        document.querySelector('.options').style.display = 'none';
    } else if (e.key === KEY_CODES.R && STATE.gamePaused) {
        togglePauseOff();
    } else if (e.key === KEY_CODES.B && STATE.gamePaused) {
        window.location.reload();
    } else if (e.key === KEY_CODES.C && (STATE.enemies.length === 0 || STATE.gameOver)) {
        window.location.reload();
    }
});
