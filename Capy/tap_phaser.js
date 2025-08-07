const GAME_DURATION = 15000;

class TapCapyScene extends Phaser.Scene {
  constructor() {
    super('TapCapy');
  }

  preload() {
    this.load.image('capy', 'assets/capybara_running_clear.png');
    this.load.image('bg', 'assets/swamp_background.png');
  }

  create() {
    this.score = 0;
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'bg')
      .setDisplaySize(this.scale.width, this.scale.height);

    this.capy = this.add
      .sprite(this.scale.width / 2, this.scale.height / 2, 'capy')
      .setScale(0.5)
      .setInteractive();
    this.capy.on('pointerdown', this.handleTap, this);

    this.scoreText = this.add.text(10, 10, '0', {
      font: '20px Arial',
      fill: '#fff'
    });

    this.moveTimer = this.time.addEvent({
      delay: 1000,
      callback: this.moveCapy,
      callbackScope: this,
      loop: true
    });

    this.time.delayedCall(GAME_DURATION, this.endGame, [], this);
  }

  handleTap() {
    this.score++;
    this.scoreText.setText(this.score);
    this.moveCapy();
  }

  moveCapy() {
    const x = Phaser.Math.Between(50, this.scale.width - 50);
    const y = Phaser.Math.Between(50, this.scale.height - 50);
    this.capy.setPosition(x, y);
  }

  endGame() {
    this.moveTimer.remove(false);
    this.capy.disableInteractive();
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2,
        `Time's up!\nScore: ${this.score}\nTap to restart`,
        {
          font: '28px Arial',
          fill: '#fff',
          align: 'center'
        }
      )
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.restart(), this);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  scene: TapCapyScene
};

new Phaser.Game(config);

