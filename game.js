import Phaser from "phaser";
import GameScene from "./src/scenes/GameScene";

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
      gravity: { y: 0 }
    }
  },
  scene: GameScene,
};

const game = new Phaser.Game(config);
