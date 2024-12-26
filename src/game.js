import StartScreen from './start_screen.js';
import GameOverScreen from './gameover_screen.js';

// Game configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        parent: 'game',
        width: 800,
        height: 600,
        min: {
            width: 320,
            height: 480
        }
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false  // Activado para debug
        }
    },
    scene: [StartScreen, GameOverScreen, {
        key: 'Game',
        preload: preload,
        create: create,
        update: update
    }]
};

const game = new Phaser.Game(config);

// Ajuste de constantes para mejor posicionamiento
//const PLATFORM_SPACING_Y = 120;    // Espacio entre filas (reducido para menor separación)
// Ajuste de constantes para dispositivos móviles
const PLATFORM_SPACING_Y = window.innerHeight < 600 ? 100 : 120;
const PLATFORM_BASE_Y = window.innerHeight < 600 ? 400 : 500;
const PLATFORM_SCALES = window.innerHeight < 600 ? 
    [1.2, 1.0, 0.8] : // Móvil
    [1.5, 1.3, 1.1];  // Desktop
//const PLATFORM_BASE_Y = 500;      // Posición base del jugador
const FIRST_ROW_Y = 400;         // Primera fila de plataformas (ajustado para estar más cerca del jugador)
const GRID_ROWS = 3;
//const PLATFORM_SCALES = [1.5, 1.3, 1.1]; // Largest at bottom, smallest at top
const ROW_X_OFFSETS = [0, 40, 80];
const SCROLL_DURATION = 400;      // Duración de la animación de scroll
const INITIAL_ROWS = 3;

let player;
let platformRows = [];
let expressionText;
let currentExpression;
let currentAnswers;
let currentCorrectAnswer;
let currentLevel = 0;
let currentProblemIndex = 0;
let score = 0;
let scoreText;
let failures = 0;
let failureText;
let questions;
let isAnimating = false;
let timer;
let timeLimit = 6;
let timerText;
let levelText;
let levelDescriptionText;

// Agreguemos una variable global para trackear los colliders
let platformColliders = [];



// Función para ajustar el UI
function createUI(scene) {
    const fontSize = window.innerWidth < 600 ? '16px' : '20px';
    const expressionFontSize = window.innerWidth < 600 ? '24px' : '36px';
    
    scoreText = scene.add.text(10, 10, `Score: ${score}`, { 
        fontSize, 
        fill: '#0f0' 
    });
    
    failureText = scene.add.text(10, 30, `Failures: ${failures}`, { 
        fontSize, 
        fill: '#f00' 
    });
    
    expressionText = scene.add.text(
        scene.cameras.main.centerX, 
        70, 
        '', 
        { 
            fontSize: expressionFontSize, 
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }
    ).setOrigin(0.5);
    
    // Ajustar posición de textos en plataformas
    platformRows.forEach(row => {
        row.platforms.forEach(p => {
            if (p.text) {
                p.text.setFontSize(window.innerWidth < 600 ? '16px' : '24px');
                p.text.y = p.platform.y + (window.innerWidth < 600 ? 10 : 14);
            }
        });
    });
}

// Función para ajustar input táctil
/*function enableTouchInput(scene) {
    scene.input.on('gameobjectdown', function(pointer, gameObject) {
        if (gameObject.input && gameObject.input.enabled) {
            const platformIndex = gameObject.platformIndex;
            handlePlatformClick(gameObject, scene, platformIndex);
        }
    });
}*/


function preload() {
    this.load.image('background', 'assets/space.jpeg');
    this.load.image('platform', 'assets/platform.png');
    this.load.spritesheet('alien', 'assets/alien.png', { frameWidth: 32, frameHeight: 48 });
    this.load.audio('jumpSound', 'assets/sounds/jump.mp3');
    this.load.audio('backgroundMusic', 'assets/sounds/background.mp3');
    this.load.audio('errorSound', 'assets/sounds/error.ogg');
}

async function create() {
    loadGameProgress();
    this.backgroundMusic = this.sound.add('backgroundMusic', {volume: 0.6, loop: true });
    this.backgroundMusic.play();
    try {
        const response = await fetch('src/dummy_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        questions = data.niveles;
    } catch (error) {
        console.error('Failed to load questions:', error);
        // Handle the error appropriately
    }

    // Setup básico
    this.add.image(400, 300, 'background');
    
    // Crear jugador primero, para que aparezca detrás de las plataformas
    player = this.physics.add.sprite(400, PLATFORM_BASE_Y + 48, 'alien').setScale(1.4).setDepth(100);
    player.setBounce(0);
    player.setCollideWorldBounds(true);
    player.body.setAllowGravity(false); // Disable gravity initially

    // UI elements
    scoreText = this.add.text(10, 30, `Score: ${score}`, { fontSize: '20px', fill: '#0f0' });
    failureText = this.add.text(10, 50, `Failures: ${failures}`, { fontSize: '20px', fill: '#f00' });
    expressionText = this.add.text(400, 100, '', { fontSize: '36px', fill: '#fff', backgroundColor: '#000', padding: { x: 10, y: 10 }, align: 'center' }).setOrigin(0.5);

    // Level UI elements
    levelText = this.add.text(790, 10, '', { fontSize: '24px', fill: '#0f0', align: 'right' }).setOrigin(1, 0);
    levelDescriptionText = this.add.text(790, 35, '', { fontSize: '16px', fill: '#fff', align: 'right' }).setOrigin(1, 0);

    // Inicializar plataformas
    initializePlatformGrid(this);

    // Asegurandose de que los grupos de física se creen correctamente
    // Configurar colisiones iniciales y guardar referencias
    platformColliders = platformRows.map(row => {
        return this.physics.add.collider(player, row.group);
    });

    // Animaciones del jugador
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('alien', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    // Activar la fila más cercana al jugador (la última del array)
    const bottomRow = platformRows[platformRows.length - 1];
    bottomRow.platforms.forEach((p, i) => {
        p.platform.setInteractive({ cursor: 'pointer' });
        p.platform.setTint(0x00ff00);
        
        p.platform.on('pointerdown', () => {
            handlePlatformClick(p.platform, this, i);
        });

        p.platform.on('pointerover', () => {
            p.platform.setTint(0xffff00);
        });

        p.platform.on('pointerout', () => {
            p.platform.setTint(0x00ff00);
        });

        // Crear texto para las respuestas
        p.text = this.add.text(p.platform.x, p.platform.y - 40, 'question', {
            fontSize: '24px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 4, y: 4 },
            align: 'center'
        }).setOrigin(0.5, 0).setDepth(2);
    });

    // Cargar primera pregunta y actualizar textos
    loadQuestion(this);
    updatePlatformAnswers();

    // Debug text
    this.add.text(10, 70, 'Debug: Click enabled', { fontSize: '16px', fill: '#ff0' });

    // Initialize timer
    timerText = this.add.text(10, 10, `Time: ${timeLimit}`, { fontSize: '20px', fill: '#fff' });
    timer = this.time.addEvent({
        delay: timeLimit * 1000,
        callback: () => {
            this.backgroundMusic.stop();
            this.scene.start('GameOverScreen');
        },
        callbackScope: this,
        loop: false
    });
}

function initializePlatformGrid(scene) {
    platformRows = [];
    
    // Crear filas de abajo hacia arriba
    for (let i = GRID_ROWS - 1; i >= 0; i--) {
        const rowY = FIRST_ROW_Y - (i * PLATFORM_SPACING_Y);
        createPlatformRow(scene, rowY, i);
    }
}

function createPlatformRow(scene, yPosition, rowIndex) {
    const group = scene.physics.add.staticGroup();
    const platforms = [];
    const scaleIndex = rowIndex;  // El índice de escala ahora corresponde directamente con la fila
    const scale = PLATFORM_SCALES[rowIndex];
    const xOffset = ROW_X_OFFSETS[rowIndex];

    for (let i = 0; i < 3; i++) {
        const x = Math.round(200 + (i * 200) + xOffset);
        const platform = group.create(x, Math.round(yPosition), 'platform');
        platform.setScale(scale);
        platform.refreshBody(); // Asegura que el cuerpo físico se actualice con la escala
        platforms.push({ platform, text: null, index: i });
    }

    // Agregar al final del array para mantener el orden de abajo hacia arriba
    platformRows.push({ group, platforms, y: yPosition });
    //return { group, platforms };
    return { group, platforms, y: yPosition };
}

function handlePlatformClick(platform, scene, platformIndex) {
    if (isAnimating) {
        console.log('Animación en progreso, click ignorado');
        return;
    }
    scene.sound.play('jumpSound');
    timer.reset({
        delay: timeLimit * 1000,
        callback: () => {
            scene.backgroundMusic.stop();
            scene.scene.start('GameOverScreen');
        },
        callbackScope: scene,
        loop: false
    });
    // Enable gravity when player starts jumping
    player.body.setAllowGravity(true);

    if (platformIndex === currentCorrectAnswer) {
        console.log('¡Respuesta correcta!');
        score++;
        currentProblemIndex++; // Incrementar solo en respuesta correcta
        scoreText.setText(`Score: ${score}`);
        saveGameProgress();
        isAnimating = true;

        // Animación de salto
        scene.tweens.add({
            targets: player,
            x: platform.x,
            y: platform.y - (48 * 1.2) / 2,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                // Fijar posición exacta después del salto
                player.x = platform.x;
                player.y = platform.y - (48 * 1.2) / 2;
                // Disable gravity after landing
                player.body.setAllowGravity(false);
                player.setVelocityY(0);
                
                // Encontrar la fila actual
                const currentRowIndex = platformRows.findIndex(row => 
                    Math.abs(row.y - player.y) < PLATFORM_SPACING_Y/2
                );
                
                // Limpiar textos y desactivar interactividad de la fila actual
                platformRows[currentRowIndex].platforms.forEach(p => {
                    if (p.text) {
                        p.text.destroy();
                        p.text = null;
                    }
                    if (p.platform.input) {
                        p.platform.disableInteractive();
                        p.platform.clearTint();
                    }
                });

                // Si estamos en la fila del medio (índice 1), iniciar scroll
                if (currentRowIndex === 1) {
                    scene.time.delayedCall(200, () => {
                        scrollGridAndPrepareNextQuestion(scene, platform.x);
                    });
                } else {
                    // Activar la siguiente fila arriba
                    const nextRow = platformRows[currentRowIndex - 1];
                    if (nextRow) {
                        // Activar solo la siguiente fila y crear nuevos textos
                        nextRow.platforms.forEach((p, i) => {
                            // Crear nuevo texto para las respuestas
                            p.text = scene.add.text(p.platform.x, p.platform.y - 40, '', {
                                fontSize: '24px',
                                fill: '#fff',
                                backgroundColor: '#000',
                                padding: { x: 4, y: 4 },
                                align: 'center'
                            }).setOrigin(0.5, 0).setDepth(2);

                            p.platform.setInteractive({ cursor: 'pointer' });
                            p.platform.setTint(0x00ff00);
                            
                            p.platform.removeAllListeners();
                            
                            p.platform.on('pointerdown', () => {
                                handlePlatformClick(p.platform, scene, i);
                            });

                            p.platform.on('pointerover', () => {
                                p.platform.setTint(0xffff00);
                            });

                            p.platform.on('pointerout', () => {
                                p.platform.setTint(0x00ff00);
                            });
                        });
                        
                        loadQuestion(scene);
                        updatePlatformAnswers();
                        isAnimating = false;
                    }
                }
            }
        });
    } else {
        console.log('¡Respuesta incorrecta!');
        scene.sound.play('errorSound');
        failures++;
        failureText.setText(`Failures: ${failures}`);
        saveGameProgress();
        scene.tweens.add({
            targets: platform,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2
        });
        player.setTint(0xff0000);
        scene.time.delayedCall(200, () => {
            player.clearTint();
        });
    }
}

function scrollGridAndPrepareNextQuestion(scene, playerX) {
    player.setVelocityY(0);
    
    const playerY = player.y;
    const currentRowIndex = platformRows.findIndex(row => 
        Math.abs(row.y - playerY) < PLATFORM_SPACING_Y/2
    );

    if (currentRowIndex <= 0) {
        isAnimating = false;
        return;
    }

    // Desactivar colisiones antes de destruir
    platformColliders.forEach(collider => {
        if (collider) {
            collider.destroy();
        }
    });
    platformColliders = [];

    // Desactivar interactividad
    platformRows.forEach(row => {
        row.platforms.forEach(p => {
            if (p.text) {
                p.text.destroy();
                p.text = null;
            }
            if (p.platform.input) {
                p.platform.disableInteractive();
                p.platform.clearTint();
            }
        });
    });

    // Remover la fila inferior
    const bottomRow = platformRows.pop();
    
    // Crear nueva fila en la parte superior
    const newRowY = FIRST_ROW_Y - (PLATFORM_SPACING_Y * 2);
    const newRow = createPlatformRow(scene, newRowY, 0);
    
    platformRows.pop();
    platformRows.unshift(newRow);

    // Reconfigurar las colisiones para todas las filas
    platformColliders = platformRows.map(row => {
        return scene.physics.add.collider(player, row.group);
    });
    
    // Configurar visibilidad inicial
    newRow.platforms.forEach(p => {
        p.platform.setAlpha(0);
    });

    // Calcular el nuevo offset para la fila del medio después del scroll
    const middleRowIndex = 1;
    const futureMiddleRowScale = PLATFORM_SCALES[middleRowIndex];
    const futureMiddleRowXOffset = ROW_X_OFFSETS[middleRowIndex];
    
    // Encontrar qué plataforma de la fila del medio estará más cerca del jugador
    const platformIndex = Math.round((playerX - 200) / 200);
    const futureX = 200 + (platformIndex * 200) + futureMiddleRowXOffset;


    // Crear la promesa para el fadeOut de la fila inferior
    const fadeOutPromise = new Promise(resolve => {
        const targets = bottomRow.platforms.map(p => {
            const elements = [p.platform];
            if (p.text) elements.push(p.text);
            return elements;
        }).flat();

        scene.tweens.add({
            targets: targets,
            alpha: 0,
            duration: SCROLL_DURATION / 2,
            ease: 'Power2',
            onComplete: () => {
                bottomRow.platforms.forEach(p => {
                    if (p.text) {
                        p.text.destroy();
                        p.text = null;
                    }
                    p.platform.destroy();
                });
                bottomRow.group.destroy();
                resolve();
            }
        });
    });

    // Crear las promesas para el scroll de las filas existentes
    const scrollPromises = platformRows.map((row, index) => {
        const newY = FIRST_ROW_Y - ((platformRows.length - 1 - index) * PLATFORM_SPACING_Y);
        const newScale = PLATFORM_SCALES[Math.min(index, PLATFORM_SCALES.length - 1)];
        const newXOffset = ROW_X_OFFSETS[Math.min(index, ROW_X_OFFSETS.length - 1)];
        
        return new Promise(resolve => {
            const platformPromises = row.platforms.map((p, i) => {
                const newX = 200 + (i * 200) + newXOffset;
                return new Promise(platformResolve => {
                    const targets = [p.platform];
                    if (p.text) targets.push(p.text);

                    scene.tweens.add({
                        targets: targets,
                        y: newY,
                        x: newX,
                        duration: SCROLL_DURATION,
                        ease: 'Power2',
                        onComplete: () => {
                            p.platform.setScale(newScale);
                            platformResolve();
                        }
                    });
                });
            });

            Promise.all(platformPromises).then(() => {
                row.y = newY;
                resolve();
            });
        });
    });

    // Crear la promesa para el fadeIn de la nueva fila
    const fadeInPromise = new Promise(resolve => {
        scene.tweens.add({
            targets: newRow.platforms.map(p => p.platform),
            alpha: 1,
            duration: SCROLL_DURATION / 2,
            ease: 'Power2',
            delay: SCROLL_DURATION / 2,
            onComplete: resolve
        });
    });

    // Animar al jugador
    scene.tweens.add({
        targets: player,
        y: `+=${PLATFORM_SPACING_Y}`,
        duration: SCROLL_DURATION,
        ease: 'Power2'
    });

    // Esperar a que terminen todas las animaciones
    Promise.all([fadeOutPromise, ...scrollPromises, fadeInPromise]).then(() => {
        // Actualizar colisiones nuevamente después de todas las transformaciones
        platformColliders.forEach(collider => {
            if (collider) {
                collider.destroy();
            }
        });
        platformColliders = platformRows.map(row => {
            return scene.physics.add.collider(player, row.group);
        });

        // Limpiar y reinicializar las filas
        platformRows.forEach(row => {
            row.platforms.forEach(p => {
                if (p.text) {
                    p.text.destroy();
                    p.text = null;
                }
                if (p.platform.input) {
                    p.platform.disableInteractive();
                    p.platform.clearTint();
                }
            });
        });

        // Cargar nueva pregunta
        loadQuestion(scene);

        // Activar la fila del medio
        const middleRow = platformRows[1];
        if (middleRow) {
            middleRow.platforms.forEach((p, i) => {
                // Asegurar que las coordenadas de las plataformas sean exactas
                const x = 200 + (i * 200) + ROW_X_OFFSETS[1];
                p.platform.x = x;
                p.platform.y = FIRST_ROW_Y - PLATFORM_SPACING_Y;

                // Crear nuevo texto para las respuestas
                p.text = scene.add.text(p.platform.x, p.platform.y - 40, '', {
                    fontSize: '24px',
                    fill: '#fff',
                    backgroundColor: '#000',
                    padding: { x: 4, y: 4 },
                    align: 'center'
                }).setOrigin(0.5, 0).setDepth(2);

                p.platform.setInteractive({ cursor: 'pointer' });
                p.platform.setTint(0x00ff00);
                
                p.platform.removeAllListeners();
                
                p.platform.on('pointerdown', () => {
                    handlePlatformClick(p.platform, scene, i);
                });

                p.platform.on('pointerover', () => {
                    p.platform.setTint(0xffff00);
                });

                p.platform.on('pointerout', () => {
                    p.platform.setTint(0x00ff00);
                });
            });
            
            // Si el jugador no está alineado con ninguna plataforma, alinearlo
            const nearestPlatform = middleRow.platforms.reduce((prev, curr) => {
                return (Math.abs(curr.platform.x - player.x) < Math.abs(prev.platform.x - player.x)) 
                    ? curr 
                    : prev;
            }).platform;
            
            player.x = nearestPlatform.x + 30;
            player.y = nearestPlatform.y + (88 * 2) / 2;
            updatePlatformAnswers();
        }
        
        isAnimating = false;
    });
}

function updatePlatformAnswers() {
    // Encontrar la fila activa (la que tiene plataformas interactivas)
    const activeRow = platformRows.find(row => 
        row.platforms.some(p => p.platform.input && p.platform.input.enabled)
    );
    
    if (activeRow) {
        activeRow.platforms.forEach((p, index) => {
            if (p.text) {
                const answer = currentAnswers[index];
                p.text.setPosition(p.platform.x, p.platform.y + 14);
                p.text.setText(answer);
                p.text.setDepth(2);
                p.text.setStyle({ 
                    fontSize: '20px',
                    fill: '#fff',
                    backgroundColor: '#000',
                    padding: { x: 4, y: 4 }
                });
                p.platform.answer = answer;
            }
        });
    }
}

function loadQuestion(scene) {
    if (currentLevel >= questions.length) {
        console.log("Game Over");
        scene.backgroundMusic.stop();
        scene.scene.start('GameOverScreen');
        return;
    }

    const currentProblems = questions[currentLevel].problemas;
    if (currentProblemIndex >= currentProblems.length) {
        currentLevel++;
        currentProblemIndex = 0;
        if (currentLevel >= questions.length) {
            console.log("Game Over");
            scene.backgroundMusic.stop();
            scene.scene.start('GameOverScreen');
            return;
        }
    }

    const currentProblem = currentProblems[currentProblemIndex];
    currentExpression = currentProblem.expresion;
    currentAnswers = currentProblem.opciones;
    currentCorrectAnswer = currentProblem.respuestaCorrecta;
    //currentProblemIndex++;
    
    expressionText.setText(currentExpression);
    
    levelText.setText(`Nivel ${currentLevel + 1}`);
    levelDescriptionText.setText(questions[currentLevel].descripcion);
    
    updatePlatformAnswers();
    //saveGameProgress();
    
    console.log('Nueva pregunta cargada:', {
        expresion: currentExpression,
        opciones: currentAnswers,
        respuestaCorrecta: currentCorrectAnswer
    });
}

function update() {
    if (player) {
        if (player.body && player.body.velocity.x === 0) {
            player.anims.stop('walk');
            player.setFrame(0);
        } else if (player.body) {
            player.anims.play('walk', true);
        }
    }
    if (timerText) {
        timerText.setText(`Time: ${Math.ceil(timer.getRemainingSeconds())}`);
    }
}

// Opcional: Agregar una función de limpieza para usar cuando sea necesario
function cleanupPhysics() {
    platformColliders.forEach(collider => {
        if (collider) {
            collider.destroy();
        }
    });
    platformColliders = [];
}

function saveGameProgress() {
    const progress = {
        score: score,
        failures: failures,
        level: currentLevel,
        problemIndex: currentProblemIndex
    };
    localStorage.setItem('gameProgress', JSON.stringify(progress));
}

function loadGameProgress() {
    const savedProgress = localStorage.getItem('gameProgress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        score = progress.score;
        failures = progress.failures;
        currentLevel = progress.level;
        currentProblemIndex = progress.problemIndex;
    }
}
