export const CONSTANTS = {
  // Camera settings
  cameraZoom: window.innerWidth * 0.0018, // 0.2%
  
  // Player constants
  playerMaxHealth: 100,
  playerSpriteScale: 0.3,
  playerRotationOffset: 230, // Degrees to adjust player sprite rotation (MUST BE 230!)
  playerMaxRotationSpeed: 0.1, // Maximum rotation speed in radians per frame
  playerSpeed: 40, // Base movement speed for the player
  
  // Trail settings
  trailSegmentSize: window.innerWidth * 0.002, // 0.2% of screen width for line thickness
  trailFadeDuration: 1000, // Increased to 1 second for slower fade
  trailColor: 0x00ffff, // Cyan color
  maxTrailSegments: 48, // Doubled again for much longer trails
  trailSpawnInterval: 16, // ~60fps for smooth line
  trailOffset: window.innerWidth * 0.02, // Increased to 2% for much wider spacing
  trailRotationOffset: 90, // Degrees to rotate the trail offset (90 = perpendicular to movement)
  
  // Enemy constants
  enemyMaxHealth: 200,
  enemySpeed: 2,
  enemyAttackRange: window.innerWidth * 0.3, // 30%
  enemyAttackInterval: 4000,
  enemyAttackDamage: 15,
  
  // UI and HUD
  healthBarWidth: window.innerWidth * 0.05, // 5%
  healthBarHeight: window.innerWidth * 0.01, // 1%
  healthBarOffset: window.innerWidth * -0.05, // 3% (increased from 1% to move bars lower)
  healthBarBackgroundColor: 0x000000,
  healthBarColor: 0xff0000,
  dashCooldownBarColor: 0xffffff, // White color for dash cooldown
  dashCooldownBarOffset: window.innerWidth * 0.015, // 1.5% (slightly below health bar)
  
  // Movement and controls
  joystickRadius: window.innerWidth * 0.03, // 3%
  joystickColor: 0x888888,
  acceleration: 0.025, // Extremely reduced for ice-like acceleration
  deceleration: 0.01, // Extremely reduced for very long sliding
  maxSpeed: 8, // Increased to compensate for the very smooth movement
  joystickSensitivity: 0.008, // Fine control over joystick sensitivity
  deadzone: 0.1, // Minimum movement threshold
  
  // Evasion dash
  dashSpeed: 3000, // Speed to cover 300px in 0.1s (300px / 0.1s = 3000px/s)
  dashVelocity: 3000, // Matching velocity for consistent movement
  dashDuration: 100, // Exactly 0.1 seconds
  dashCooldown: 800, // Keep the quick cooldown
  
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
  lineAttackDamageMin: 15,
  lineAttackDamageMax: 25,
  lineAttackCritChance: 0.2, // 20% chance to crit
  lineAttackCritMultiplier: 1.5, // 50% more damage on crit
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
