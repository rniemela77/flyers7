// import Phaser from 'phaser';
import gameConfig from './config/gameConfig.js';
import MainScene from './scenes/MainScene.js';

// Set the scene in the game configuration
const config = { ...gameConfig, scene: MainScene };

// Initialize the game
const game = new Phaser.Game(config);

export default game; 
