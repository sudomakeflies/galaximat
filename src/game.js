import * as algebra from './algebra.js';

// game.js

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Create a new Phaser game
const game = new Phaser.Game(config);

// Preload assets
function preload() {
    this.load.image('background', 'assets/space.jpeg');
    this.load.image('platform', 'assets/platform.png');
    this.load.spritesheet('alien', 'assets/alien.png', { frameWidth: 32, frameHeight: 48 });
}

let player;
let platforms;
let expressionText;
let currentExpression = 'y+y'; // Example expression
let currentAnswers = ['2', '3', '4']; // Example answers
let failures = 0;
let failureText;

// Create game elements
function create() {
    // Add background
    const scene = this;
    const gameScene = this;
    scene.add.image(400, 300, 'background');

    // Create platforms
    platforms = scene.physics.add.staticGroup();
    // Position platforms in front of the player
    const platformPositions = [200, 400, 600];
    platformPositions.forEach((x, index) => {
        const platform = platforms.create(x, 400, 'platform').setScale(1.5);
        platform.setInteractive();
        platform.answer = currentAnswers[index];
        platform.on('pointerdown', () => {
            handlePlatformClick(platform, gameScene);
        });
        // Add answer text below the platform
        scene.add.text(x, 450, currentAnswers[index], { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5, 0);
    });

    // Create player
    player = this.physics.add.sprite(400, 550, 'alien').setScale(1.5);
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // Player animations
    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('alien', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    // Display expression
    expressionText = this.add.text(10, 10, currentExpression, { fontSize: '20px', fill: '#fff' });

    // Display failures
    failureText = this.add.text(10, 50, `Failures: ${failures}`, { fontSize: '20px', fill: '#fff' });
}

function handlePlatformClick(platform, gameScene) {
    let correctAnswer;
    try {
        correctAnswer = math.evaluate(currentExpression, { x: 1, y: 1 }).toString();
    } catch (e) {
        correctAnswer = '0';
    }
    console.log(correctAnswer, platform.answer);
    if (platform.answer === correctAnswer) {
        console.log("Correct answer!");
        gameScene.tweens.add({
            targets: player,
            x: platform.x,
            y: platform.y - 50,
            duration: 500,
            onComplete: () => {
                generateNewLevel();
            }
        });
    } else {
        console.log("Incorrect answer!");
        failures++;
        failureText.setText(`Failures: ${failures}`);
    }
}

function generateNewLevel() {
    // Destroy old platforms
    platforms.clear(true, true);

    // Generate new expression and answers
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    const c = Math.floor(Math.random() * 5) + 1;
    const operation = ['add', 'subtract', 'multiply', 'divide', 'power'][Math.floor(Math.random() * 5)];
    let expr;
    if (operation === 'add') {
        expr = algebra.add(`${a}x`, `${b}y`);
    } else if (operation === 'subtract') {
        expr = algebra.subtract(`${a}x`, `${b}y`);
    } else if (operation === 'multiply') {
        expr = algebra.multiply(`${a}x`, `${b}y`);
    } else if (operation === 'divide') {
         expr = algebra.divide(`${a}x`, `${b}y`);
    } else if (operation === 'power') {
        expr = algebra.power(`x`, `${c}`);
    }
    currentExpression = expr;
    currentAnswers = [1, 2, 3].map(x => {
        try {
            return math.evaluate(currentExpression, { x: x, y: x }).toString();
        } catch (e) {
            return '0';
        }
    });
    Phaser.Utils.Array.Shuffle(currentAnswers);

    // Create new platforms
    const platformPositions = [200, 400, 600];
    platformPositions.forEach((x, index) => {
        const platform = platforms.create(x, 400, 'platform').setScale(1.5);
        platform.setInteractive();
        platform.answer = currentAnswers[index];
        platform.on('pointerdown', () => {
            handlePlatformClick(platform);
        });
         // Add answer text below the platform
        this.add.text(x, 450, currentAnswers[index], { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5, 0);
    });

    // Update expression text
    expressionText.setText(currentExpression);

    // Move platforms forward
    platforms.getChildren().forEach(platform => {
        platform.x -= 200;
        if (platform.x < -100) {
            platform.x = 900;
        }
    });

    // Reset player position
     player.setPosition(400, 550);
    player.setVelocityX(0);
}

// Update game state
function update() {
    if (player.body.velocity.x === 0) {
        player.anims.stop('walk');
        player.setFrame(0);
    } else {
        player.anims.play('walk', true);
    }
}
