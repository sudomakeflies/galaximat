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
        const gameOverText = this.add.text(400, 300, '', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5);
    }
}

export default GameOverScreen;
