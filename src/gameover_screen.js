class GameOverScreen extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScreen' });
    }

    preload() {
        this.load.image('gameover_splash', 'assets/gameover.png');
        this.load.audio('gameOverSound', 'assets/sounds/gameover.wav');
    }

    create() {
        this.gameOverSound = this.sound.add('gameOverSound', { loop: false });
        this.gameOverSound.play();
        this.add.image(400, 300, 'gameover_splash');
        const gameOverText = this.add.text(400, 450, '', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5);
        
        const savedProgress = localStorage.getItem('gameProgress');
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            gameOverText.setText(`Score: ${progress.score}\nFailures: ${progress.failures}\nLevel: ${progress.level + 1}\nQuestion: ${progress.problemIndex + 1}`);
        } else {
            gameOverText.setText('No progress saved');
        }

        const startAgainButton = this.add.text(780, 580, 'Start Again', { fontSize: '24px', fill: '#0f0', backgroundColor: '#000', padding: {x: 10, y: 5}})
            .setOrigin(1, 1)
            .setInteractive({ cursor: 'pointer' })
            .on('pointerdown', () => {
                this.scene.start('StartScreen');
            });
    }
}

export default GameOverScreen;
