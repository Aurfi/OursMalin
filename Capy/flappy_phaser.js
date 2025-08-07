const GAP = 140;

class FlappyCapyScene extends Phaser.Scene {
  constructor() {
    super('FlappyCapy');
  }

  preload() {
    this.load.image('capy', 'assets/capybara_flying.png');
    this.load.image('bg', 'assets/bamboo_bg.png');
  }

  create() {
    this.score = 0;
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'bg')
      .setDisplaySize(this.scale.width, this.scale.height);

    this.capy = this.physics
      .add.sprite(100, this.scale.height / 2, 'capy')
      .setScale(0.5);
    this.capy.setCollideWorldBounds(true);

    this.pipes = this.physics.add.group();
    this.cursors = this.input.keyboard.createCursorKeys();

    this.scoreText = this.add.text(10, 10, '0', {
      font: '20px Arial',
      fill: '#fff'
    });

    this.tapText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Tap to start', {
        font: '28px Arial',
        fill: '#fff'
      })
      .setOrigin(0.5);

    this.physics.pause();
    this.input.once('pointerdown', this.startGame, this);
    this.input.keyboard.once('keydown-SPACE', this.startGame, this);

    this.physics.add.collider(
      this.capy,
      this.pipes,
      this.gameOver,
      null,
      this
    );
  }

  startGame() {
    this.tapText.destroy();
    this.physics.resume();
    this.spawnPipes();
    this.time.addEvent({
      delay: 1500,
      callback: this.spawnPipes,
      callbackScope: this,
      loop: true
    });
    this.gameState = 'playing';
  }

  update() {
    if (this.gameState !== 'playing') return;

    if (this.cursors.space.isDown || this.cursors.up.isDown) {
      this.flap();
    }
    this.pipes.getChildren().forEach((pipe) => {
      if (!pipe.scored && pipe.isTop && pipe.x + pipe.width / 2 < this.capy.x) {
        pipe.scored = true;
        this.score += 1;
        this.scoreText.setText(this.score);
      }
      if (pipe.x < -50) {
        pipe.destroy();
      }
    });
  }

  flap() {
    this.capy.setVelocityY(-300);
  }

  spawnPipes() {
    const topHeight = Phaser.Math.Between(50, this.scale.height - GAP - 50);
    const bottomY = topHeight + GAP;

    const top = this.add.rectangle(
      this.scale.width,
      topHeight / 2,
      50,
      topHeight,
      0x90a4ae
    );
    const bottomHeight = this.scale.height - bottomY;
    const bottom = this.add.rectangle(
      this.scale.width,
      bottomY + bottomHeight / 2,
      50,
      bottomHeight,
      0x90a4ae
    );

    this.physics.add.existing(top);
    this.physics.add.existing(bottom);
    top.body.setVelocityX(-200).setImmovable(true).setAllowGravity(false);
    bottom.body.setVelocityX(-200).setImmovable(true).setAllowGravity(false);
    top.isTop = true;
    top.scored = false;

    this.pipes.add(top);
    this.pipes.add(bottom);
  }

  gameOver() {
    this.gameState = 'gameover';
    this.physics.pause();
    this.capy.setTint(0xff0000);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Over\nTap to restart', {
        font: '28px Arial',
        fill: '#fff',
        align: 'center'
      })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.restart(), this);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scene: FlappyCapyScene
};

new Phaser.Game(config);

