import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { GameScene } from './scenes/GameScene';

const config = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.display.width,
    height: GAME_CONFIG.display.height,
    scale: {
        mode: GAME_CONFIG.display.scale,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: GameScene
};

// Initialize the game
const game = new Phaser.Game(config); 