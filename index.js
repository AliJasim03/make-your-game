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
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
};

window.addEventListener('resize', () => {
    GAME_DIMENSIONS.WIDTH = window.innerWidth;
    GAME_DIMENSIONS.HEIGHT = window.innerHeight;
    const $player = document.querySelector('.player');
    if ($player) {
        setPosition($player, GAME_DIMENSIONS.WIDTH / 2 - STATE.spaceshipWidth / 2, GAME_DIMENSIONS.HEIGHT - 50);
    }
});

const life = document.getElementById('life');
const timerElement = document.getElementById('timer');
const pauseMenu = document.querySelector('.pause');
const $container = document.querySelector('.main');

let gameId = null;
let score = 0;

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
    gameOver: false,
    gamePaused: false,
    gameStarted: false,
    gameOptions: false,
    lives: 3,
};

let startTime = null;
let elapsedTime = 0;
let timeInterval = null;
let beforeStop = 0;

function setPosition($element, x, y) {
    $element.style.transform = `translate(${x}px, ${y}px)`;
}

function setSize($element, width) {
    $element.style.width = `${width}px`;
    $element.style.height = 'auto';
}

function bound(x) {
    if (x >= GAME_DIMENSIONS.WIDTH - STATE.spaceshipWidth) {
        return GAME_DIMENSIONS.WIDTH - STATE.spaceshipWidth;
    } else if (x <= 0) {
        return 0;
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

function startTimer() {
    startTime = Date.now();
    timeInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    if (STATE.gamePaused) return;
    elapsedTime = Date.now() - startTime;
    displayTime(elapsedTime + beforeStop);
}

function pauseTimer() {
    if (timeInterval) {
        clearInterval(timeInterval);
        beforeStop += elapsedTime;
    } else if (STATE.gameStarted) {
        startTimer();
    }
}

function resetTimer() {
    clearInterval(timeInterval);
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
    pauseTimer();
    document.removeEventListener('keydown', handleKeyPress);
    document.removeEventListener('keyup', handleKeyRelease);
    pauseMenu.style.display = 'block';
    cancelAnimationFrame(gameId);
}

function togglePauseOff() {
    STATE.gamePaused = false;
    resetTimer();
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    pauseMenu.style.display = 'none';
    gameId = requestAnimationFrame(update);
}

function createPlayer() {
    STATE.xPos = GAME_DIMENSIONS.WIDTH / 2;
    STATE.yPos = GAME_DIMENSIONS.HEIGHT - 100;
    const $player = document.createElement('img');
    $player.src = 'images/spaceship.png';
    $player.className = 'player';
    $container.appendChild($player);
    setPosition($player, STATE.xPos, STATE.yPos);
    setSize($player, STATE.spaceshipWidth);
    updateLives();
}

function updateLives() {
    life.textContent = `Lives: ${'❤️'.repeat(STATE.lives)}`;
}

function updatePlayer() {
    if (STATE.moveLeft) STATE.xPos -= 3;
    if (STATE.moveRight) STATE.xPos += 3;

    // Ensure the x position is within bounds
    STATE.xPos = bound(STATE.xPos);

    if (STATE.shoot && STATE.cooldown === 0) {
        createLaser(STATE.xPos - STATE.spaceshipWidth / 2, STATE.yPos);
        STATE.cooldown = 30;
    }
    const $player = document.querySelector('.player');
    setPosition($player, bound(STATE.xPos), STATE.yPos - 15);
    if (STATE.cooldown > 0) STATE.cooldown -= 1;
}

function createLaser(x, y) {
    const $laser = document.createElement('img');
    $laser.src = 'images/laser.png';
    $laser.className = 'laser';
    $container.appendChild($laser);
    STATE.lasers.push({ x, y, $laser });
    setPosition($laser, x, y);
}

function updateLasers() {
    STATE.lasers.forEach((laser, index) => {
        laser.y -= 3;
        if (laser.y < 0) {
            removeElement(STATE.lasers, index, laser.$laser);
        }
        setPosition(laser.$laser, laser.x, laser.y);
        const laserRect = laser.$laser.getBoundingClientRect();
        STATE.enemies.forEach((enemy, enemyIndex) => {
            const enemyRect = enemy.$enemy.getBoundingClientRect();
            if (collideRect(laserRect, enemyRect)) {
                removeElement(STATE.lasers, index, laser.$laser);
                removeElement(STATE.enemies, enemyIndex, enemy.$enemy);
                score += 100;
            }
        });
    });
}

function createEnemy(x, y) {
    const $enemy = document.createElement('img');
    $enemy.src = 'images/ufo.png';
    $enemy.className = 'enemy';
    $container.appendChild($enemy);
    STATE.enemies.push({ x, y, $enemy, enemyCooldown: Math.floor(Math.random() * 500) + 200 });
    setSize($enemy, STATE.enemyWidth);
    setPosition($enemy, x, y);
}

function updateEnemies() {
    const dx = Math.sin(Date.now() / 1000) * 40;
    const dy = Math.cos(Date.now() / 1000) * 30;
    STATE.enemies.forEach((enemy) => {
        const a = enemy.x + dx;
        const b = enemy.y + dy;
        setPosition(enemy.$enemy, a, b);
        if (enemy.enemyCooldown === 0 && !STATE.gameOver) {
            createEnemyLaser(a, b);
            enemy.enemyCooldown = Math.floor(Math.random() * 500) + 200;
        }
        enemy.enemyCooldown -= 1;
    });
}

function createEnemies() {
    const rows = 2;
    const cols = Math.floor(GAME_DIMENSIONS.WIDTH / (STATE.enemyWidth + 20));  // 20 is the padding between enemies
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * (STATE.enemyWidth + 20) + 10;  // 10 is the initial padding from the left
            const y = row * (STATE.enemyWidth + 20) + 50;  // 50 is the initial padding from the top
            createEnemy(x, y);
        }
    }
}


function createEnemyLaser(x, y) {
    const $enemyLaser = document.createElement('img');
    $enemyLaser.src = 'images/enemyLaser.png';
    $enemyLaser.className = 'enemyLaser';
    $container.appendChild($enemyLaser);
    STATE.enemyLasers.push({ x, y, $enemyLaser });
    setPosition($enemyLaser, x, y);
}

function updateEnemyLasers() {
    STATE.enemyLasers.forEach((laser, index) => {
        laser.y += 2;
        if (laser.y > GAME_DIMENSIONS.HEIGHT - 30) {
            removeElement(STATE.enemyLasers, index, laser.$enemyLaser);
        }
        const laserRect = laser.$enemyLaser.getBoundingClientRect();
        const playerRect = document.querySelector('.player').getBoundingClientRect();
        if (collideRect(playerRect, laserRect)) {
            removeElement(STATE.enemyLasers, index, laser.$enemyLaser);
            gameOver();
        }
        setPosition(laser.$enemyLaser, laser.x + STATE.enemyWidth / 2, laser.y + 15);
    });
}


function handleKeyPress(event) {
    if (STATE.gameOver) return;
    switch (event.keyCode) {
        case KEY_CODES.RIGHT:
            STATE.moveRight = true;
            break;
        case KEY_CODES.LEFT:
            STATE.moveLeft = true;
            break;
        case KEY_CODES.SPACE:
            STATE.shoot = true;
            break;
        case KEY_CODES.ESC:
            if (STATE.gameStarted) togglePauseOn();
            break;
    }
}

function handleKeyRelease(event) {
    switch (event.keyCode) {
        case KEY_CODES.RIGHT:
            STATE.moveRight = false;
            break;
        case KEY_CODES.LEFT:
            STATE.moveLeft = false;
            break;
        case KEY_CODES.SPACE:
            STATE.shoot = false;
            break;
    }
}

function updateScore(points) {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = `Points: ${points}`;
}

function gameOver() {
    STATE.lives -= 1;
    if (STATE.lives > 0) {
        resetPlayerPosition();
        updateLives();
    } else {
        STATE.gameOver = true;
        cancelAnimationFrame(gameId);
        document.removeEventListener('keyup', handleKeyRelease);
        life.textContent = 'Lives: 💔';
        document.querySelector('.lose').style.display = 'block';
    }
}

function resetPlayerPosition() {
    const $player = document.querySelector('.player');
    STATE.xPos = GAME_DIMENSIONS.WIDTH / 2;
    STATE.yPos = GAME_DIMENSIONS.HEIGHT - 100;
    setPosition($player, STATE.xPos, STATE.yPos);
    document.querySelector('.player').style.filter = 'none';
    STATE.gamePaused = false;
    togglePauseOff();
}


function openOptionMenu() {
    if (!STATE.gameOptions) {
        STATE.gameOptions = true;
        document.querySelector('.menu').style.display = 'none';
        document.querySelector('.options').style.display = 'block';
    }
}

function update() {
    updatePlayer();
    updateLasers();
    updateEnemies();
    updateEnemyLasers();
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

function init() {
    timerElement.style.display = 'inline';
    life.style.display = 'inline';
    life.textContent = 'Lives: ❤️';
    document.querySelector('.menu').style.display = 'none';
    createPlayer();
    createEnemies();
    STATE.gameStarted = true;
    startTimer();
    update();
}

function removeElement(array, index, element) {
    array.splice(index, 1);
    if ($container.contains(element)) {
        $container.removeChild(element);
    }
}

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
