class StartScreen extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScreen' });
    }

    preload() {
        this.load.image('start_splash', 'assets/start_screen.png');
    }

    create() {
        this.add.image(400, 300, 'start_splash');
        const startButton = this.add.text(400, 300, '         ', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('Game');
            });
    }
}

export default StartScreen;
