const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scene: { preload, create, update }
};

let capy;
let pipes;
let cursors;
let score = 0;
let scoreText;
const GAP = 140;

function preload() {
  this.load.image('capy', 'assets/capybara_flying.png');
}

function create() {
  capy = this.physics.add.sprite(100, config.height / 2, 'capy').setScale(0.5);
  capy.setCollideWorldBounds(true);

  pipes = this.physics.add.group();
  spawnPipes.call(this);
  this.time.addEvent({ delay: 1500, callback: spawnPipes, callbackScope: this, loop: true });

  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', flap, this);

  scoreText = this.add.text(10, 10, '0', { font: '20px Arial', fill: '#fff' });
  this.physics.add.collider(capy, pipes, gameOver, null, this);
}

function update() {
  if (cursors.space.isDown || cursors.up.isDown) {
    flap.call(this);
  }
  pipes.getChildren().forEach((pipe) => {
    if (!pipe.scored && pipe.isTop && pipe.x + pipe.width / 2 < capy.x) {
      pipe.scored = true;
      score += 1;
      scoreText.setText(score);
    }
    if (pipe.x < -50) {
      pipe.destroy();
    }
  });
}

function flap() {
  capy.setVelocityY(-300);
}

function spawnPipes() {
  const topHeight = Phaser.Math.Between(50, config.height - GAP - 50);
  const bottomY = topHeight + GAP;

  const top = this.add.rectangle(config.width, topHeight / 2, 50, topHeight, 0x90a4ae);
  const bottomHeight = config.height - bottomY;
  const bottom = this.add.rectangle(config.width, bottomY + bottomHeight / 2, 50, bottomHeight, 0x90a4ae);

  this.physics.add.existing(top);
  this.physics.add.existing(bottom);
  top.body.setVelocityX(-200).setImmovable(true).setAllowGravity(false);
  bottom.body.setVelocityX(-200).setImmovable(true).setAllowGravity(false);
  top.isTop = true;
  top.scored = false;

  pipes.add(top);
  pipes.add(bottom);
}

function gameOver() {
  this.physics.pause();
  capy.setTint(0xff0000);
  this.input.once('pointerdown', () => {
    score = 0;
    this.scene.restart();
  });
}

new Phaser.Game(config);
