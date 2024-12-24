class StartScreen extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScreen' });
    }

    preload() {
        this.load.image('start_splash', 'assets/start_screen.png');
        this.load.audio('introMusic', 'assets/sounds/intro.wav');
    }

    create() {
        this.introMusic = this.sound.add('introMusic', { loop: true });
        this.introMusic.play();
        this.add.image(400, 300, 'start_splash');
        const startButton = this.add.text(400, 300, '         ', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.introMusic.stop();
                this.scene.start('Game');
            });
    }
}

export default StartScreen;
