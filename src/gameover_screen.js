class GameOverScreen extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScreen' });
    }

    preload() {
        this.load.image('gameover_splash', 'assets/gameover.png');
    }

    create() {
        this.add.image(400, 300, 'gameover_splash');
        const gameOverText = this.add.text(400, 300, '', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5);
    }
}

export default GameOverScreen;
