export const CONSTANTS = {
  // Player constants
  playerMaxHealth: 100,
  playerSpriteScale: 0.3,
  playerRotationOffset: 230, // Degrees to adjust player sprite rotation (MUST BE 230!)
  playerMaxRotationSpeed: 0.1, // Maximum rotation speed in radians per frame
  playerSpeed: 20, // Base movement speed for the player
  
  // Enemy constants
  enemyMaxHealth: 200,
  enemySpeed: 2,
  enemyAttackRange: window.innerWidth * 0.3, // 30%
  enemyAttackInterval: 4000,
  enemyAttackDamage: 15,
  
  // UI and HUD
  healthBarWidth: window.innerWidth * 0.05, // 5%
  healthBarHeight: window.innerWidth * 0.01, // 1%
  healthBarOffset: window.innerWidth * 0.01, // 1%
  healthBarBackgroundColor: 0x000000,
  healthBarColor: 0xff0000,
  
  // Movement and controls
  joystickRadius: window.innerWidth * 0.03, // 3%
  joystickColor: 0x888888,
  acceleration: 0.1,
  deceleration: 0.05,
  maxSpeed: 5,
  
  // Basic shapes (for collision and visuals)
  squareSize: window.innerWidth * 0.05, // 5%
  squareColor: 0xff0000,
  circleRadius: window.innerWidth * 0.025, // 2.5%
  circleColor: 0x0000ff,
  
  // Yellow attack properties
  yellowCircleOutlineColor: 0xffff00,
  fillYellowCircleDelay: 3000,
  fillYellowCircleDuration: 500,
  yellowCircleAttackDamage: 45,
  
  // Line attack properties
  lineAttackDamage: 20,
  lineAttackDuration: 200,
  
  // Purple attack properties
  purpleCircleRadius: window.innerWidth * 0.175, // 17.5%
  purpleCircleColor: 0x800080,
  purpleTelegraphDuration: 5500,
  purpleAttackDuration: 500,
  purpleAttackCooldown: 7000,
  purpleAttackDamage: 30,
  
  // Stick attack properties
  stickAttackDamage: 10,
  stickRotationLerp: 0.02,
  stickLength: window.innerWidth * 0.3, // 30%
  stickWidth: window.innerWidth * 0.02, // 2%
  stickColor: 0x00ff00,
  stickTelegraphDuration: 3500,
  stickAttackDuration: 500,
  stickAttackCooldown: 6000,
};
