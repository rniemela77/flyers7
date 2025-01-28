const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false,
        },
    },
    scene: {
        preload,
        create,
        update,
    },
};
  
let player;
let hookPoints;
let currentHookPoint = null;
let hookActive = false;
let ropeGraphics;
let aimGraphics;
let cursors;
let canGrapple = true;
let isDragging = false;
let dragStartPoint = { x: 0, y: 0 };
let hookAngle = 0;
const HOOK_RANGE = 400;
const HOOK_SPEED = 2000;
const WORLD_HEIGHT = 10000; // Very tall world
const CHUNK_HEIGHT = 600; // Height of each chunk of hook points
let highestPoint = 0; // Track player's highest point
let lastGeneratedY = 0; // Track last generated hook point height
  
// Hook projectile
let hookProjectile;
let isHookFlying = false;
  
// Add new variables at the top with other declarations
let springForce = 0;
let springVelocity = 0;
const SPRING_CONSTANT = 0.005;
const SPRING_DAMPING = 0.98;
const SPRING_LENGTH = 200;
  
const game = new Phaser.Game(config);
  
function generateHookPointsInRange(scene, startY, endY) {
    const points = [];
    const VERTICAL_SPACING = 200; // Consistent vertical spacing
    const numRows = Math.ceil((endY - startY) / VERTICAL_SPACING);
    const gameWidth = game.config.width; // Get current game width
    
    // Generate points row by row
    for (let row = 0; row < numRows; row++) {
        const y = startY + (row * VERTICAL_SPACING);
        
        // Add 2-3 points per row for good coverage
        const pointsInRow = Phaser.Math.Between(2, 3);
        
        for (let i = 0; i < pointsInRow; i++) {
            let x;
            if (pointsInRow === 2) {
                // If 2 points, place them on opposite sides
                x = (i === 0) ? 
                    Phaser.Math.Between(50, gameWidth/3) : 
                    Phaser.Math.Between(2 * gameWidth/3, gameWidth - 50);
            } else {
                // If 3 points, spread them left, middle, and right
                if (i === 0) x = Phaser.Math.Between(50, gameWidth/3);
                else if (i === 1) x = Phaser.Math.Between(gameWidth/3, 2 * gameWidth/3);
                else x = Phaser.Math.Between(2 * gameWidth/3, gameWidth - 50);
            }
            
            // Add some slight vertical randomness but maintain general spacing
            const randomY = y + Phaser.Math.Between(-30, 30);
            points.push({ x, y: randomY });
        }
    }
    
    points.forEach(point => {
        hookPoints.create(point.x, point.y, 'hookPoint');
    });
    
    lastGeneratedY = endY;
}
  
function preload() {
    // Replace with actual file paths
    this.load.image('player', 'assets/player.png');
    this.load.image('hookPoint', 'assets/anchor.png');
    this.load.image('hook', 'assets/anchor.png'); // Reusing anchor for hook projectile
}
  
function create() {
    // Set world bounds - use width from game config
    this.physics.world.setBounds(0, 0, game.config.width, WORLD_HEIGHT);
    
    // Create static hook points
    hookPoints = this.physics.add.staticGroup();
    
    // Generate hook points starting from the very bottom
    const initialStart = WORLD_HEIGHT - CHUNK_HEIGHT * 3;
    const initialEnd = WORLD_HEIGHT;
    
    // Generate initial chunks from bottom up
    generateHookPointsInRange(this, initialEnd - CHUNK_HEIGHT, initialEnd); // Bottom chunk
    generateHookPointsInRange(this, initialEnd - CHUNK_HEIGHT * 2, initialEnd - CHUNK_HEIGHT); // Middle chunk
    generateHookPointsInRange(this, initialEnd - CHUNK_HEIGHT * 3, initialEnd - CHUNK_HEIGHT * 2); // Top chunk
    
    // Create player at the bottom of the screen
    const startY = WORLD_HEIGHT - 100;
    player = this.physics.add.sprite(game.config.width / 2, startY, 'player');
    player.setCollideWorldBounds(true);
    player.setBounce(0.1);
    player.setDrag(30);
    player.setMaxVelocity(1000, 1200);
  
    // Set up camera to follow player
    this.cameras.main.setBounds(0, 0, game.config.width, WORLD_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 100);
  
    // Set initial camera position to show player at bottom
    this.cameras.main.scrollY = WORLD_HEIGHT - game.config.height;
  
    // Create hook projectile
    hookProjectile = this.physics.add.sprite(0, 0, 'hook');
    hookProjectile.setVisible(false);
    hookProjectile.setScale(0.5); // Make the hook smaller
  
    // Add collision between hook and hook points
    this.physics.add.overlap(hookProjectile, hookPoints, (hook, point) => {
        if (isHookFlying) {
            isHookFlying = false;
            hookProjectile.setVisible(false);
            hookActive = true;
            currentHookPoint = point;
            
            // Add screen shake and flash effect on connection
            addScreenShake(this, 2);
            point.setTint(0xffff00);
            this.time.delayedCall(100, () => point.clearTint());
            
            // Initial boost toward hook point with spring setup
            const dx = point.x - player.x;
            const dy = point.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const boostSpeed = Math.min(700, dist * 2);
            
            // Set initial spring values
            springForce = 0;
            springVelocity = 0;
            
            player.setVelocity(
                (dx / dist) * boostSpeed,
                (dy / dist) * boostSpeed
            );
        }
    });
  
    // Graphics for rope and aim line
    ropeGraphics = this.add.graphics({ lineStyle: { width: 2, color: 0xffffff } });
    aimGraphics = this.add.graphics({ lineStyle: { width: 2, color: 0x00ff00 } });
  
    // Make graphics follow camera
    ropeGraphics.setScrollFactor(1);
    aimGraphics.setScrollFactor(1);
  
    // Add keyboard controls
    cursors = this.input.keyboard.createCursorKeys();
  
    // Drag to aim system
    this.input.on('pointerdown', (pointer) => {
      if (!hookActive && canGrapple && !isHookFlying) {
        isDragging = true;
        // Store screen coordinates instead of world coordinates
        dragStartPoint.x = pointer.x;
        dragStartPoint.y = pointer.y;
      } else if (!isHookFlying) {
        hookActive = false;
        currentHookPoint = null;
      }
    });
  
    this.input.on('pointermove', (pointer) => {
      if (isDragging) {
        // Calculate angle based on screen-space coordinates
        const playerScreenX = player.x - this.cameras.main.scrollX;
        const playerScreenY = player.y - this.cameras.main.scrollY;
        
        // Get the drag vector relative to player's screen position
        const dx = (pointer.x - dragStartPoint.x);
        const dy = (pointer.y - dragStartPoint.y);
        hookAngle = Math.atan2(dy, dx);
      }
    });
  
    this.input.on('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        
        // Add screen shake on launch
        addScreenShake(this, 1);
        
        // Launch hook projectile
        hookProjectile.setPosition(player.x, player.y);
        hookProjectile.setVisible(true);
        isHookFlying = true;
        
        // Set hook velocity in the aimed direction
        const dirX = Math.cos(hookAngle);
        const dirY = Math.sin(hookAngle);
        hookProjectile.setVelocity(
          dirX * HOOK_SPEED,
          dirY * HOOK_SPEED
        );
        
        // Start a timer to reset hook if it doesn't hit anything
        this.time.delayedCall(500, () => {
          if (isHookFlying) {
            isHookFlying = false;
            hookProjectile.setVisible(false);
          }
        });
      } else if (hookActive) {
        // Add release boost based on current velocity
        const speed = Math.sqrt(
            player.body.velocity.x * player.body.velocity.x +
            player.body.velocity.y * player.body.velocity.y
        );
        
        if (speed > 400) {
            const boostMultiplier = 1.2;
            player.setVelocity(
                player.body.velocity.x * boostMultiplier,
                player.body.velocity.y * boostMultiplier
            );
            addScreenShake(this, speed / 400); // Shake based on speed
        }
        
        hookActive = false;
        currentHookPoint = null;
      }
    });
}
  
function update() {
    ropeGraphics.clear();
    aimGraphics.clear();
  
    // Track highest point reached and generate new chunks
    if (player.y < highestPoint || highestPoint === 0) {
        highestPoint = player.y;
        
        // Generate new hook points when player is closer to the top of generated area
        if (highestPoint < lastGeneratedY - (CHUNK_HEIGHT * 2)) {
            const newChunkEnd = lastGeneratedY - CHUNK_HEIGHT;
            const newChunkStart = newChunkEnd - CHUNK_HEIGHT;
            generateHookPointsInRange(this, newChunkStart, newChunkEnd);
        }
    }
  
    // Clean up old hook points that are far below
    hookPoints.getChildren().forEach(point => {
        if (point.y > player.y + CHUNK_HEIGHT * 3) {
            point.destroy();
        }
    });
  
    // Draw aim line while dragging (adjusted for camera)
    if (isDragging && !hookActive) {
      const lineLength = 100;
      aimGraphics.lineStyle(2, 0x00ff00);
      aimGraphics.beginPath();
      aimGraphics.moveTo(player.x, player.y);
      aimGraphics.lineTo(
        player.x + Math.cos(hookAngle) * lineLength,
        player.y + Math.sin(hookAngle) * lineLength
      );
      aimGraphics.stroke();
      
      aimGraphics.lineStyle(1, 0x00ff00, 0.3);
      aimGraphics.strokeCircle(player.x, player.y, HOOK_RANGE);
    }
  
    // Reset hook if it goes too far
    if (isHookFlying) {
      const dist = Phaser.Math.Distance.Between(player.x, player.y, hookProjectile.x, hookProjectile.y);
      if (dist > HOOK_RANGE) {
        isHookFlying = false;
        hookProjectile.setVisible(false);
      }
      
      // Draw rope to hook projectile while it's flying
      ropeGraphics.lineStyle(2, 0xffffff);
      ropeGraphics.lineBetween(player.x, player.y, hookProjectile.x, hookProjectile.y);
    }
  
    // More responsive horizontal movement
    if (!hookActive) {
      if (cursors.left.isDown) {
        player.setVelocityX(player.body.velocity.x - 40);
      } else if (cursors.right.isDown) {
        player.setVelocityX(player.body.velocity.x + 40);
      }
    }
  
    if (hookActive && currentHookPoint) {
        // Draw rope with spring effect
        const dx = currentHookPoint.x - player.x;
        const dy = currentHookPoint.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate spring physics
        const stretch = dist - SPRING_LENGTH;
        springForce = stretch * SPRING_CONSTANT;
        springVelocity += springForce;
        springVelocity *= SPRING_DAMPING;
        
        // Apply spring effect to rope visual with reduced offset
        const springOffset = springVelocity * 10; // Reduced from 20
        
        // Calculate curve control point with limited offset
        const maxOffset = dist * 0.3; // Limit offset to 30% of rope length
        const actualOffset = Math.min(Math.abs(springOffset), maxOffset) * Math.sign(springOffset);
        
        // Calculate midpoint with smoother curve
        const midX = (player.x + currentHookPoint.x) / 2 + (dy / dist) * actualOffset;
        const midY = (player.y + currentHookPoint.y) / 2 - (dx / dist) * actualOffset;
        
        // Draw curved rope using proper Phaser methods
        ropeGraphics.clear();
        ropeGraphics.lineStyle(2, 0xffffff);
        ropeGraphics.beginPath();
        ropeGraphics.moveTo(player.x, player.y);
        
        // Draw multiple line segments to create curve effect
        const segments = 16;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            // Modified curve calculation for more natural sag
            const tx = player.x + (midX - player.x) * 2 * t * (1 - t) + (currentHookPoint.x - player.x) * (t * t);
            const ty = player.y + (midY - player.y) * 2 * t * (1 - t) + (currentHookPoint.y - player.y) * (t * t) + (Math.sin(t * Math.PI) * 5); // Added slight natural sag
            ropeGraphics.lineTo(tx, ty);
        }
        ropeGraphics.strokePath();
        
        // Dynamic pull strength based on distance and spring
        const pullStrength = 0.025 * (1 + Math.abs(springVelocity) * 0.1);
        player.body.velocity.x += dx * pullStrength;
        player.body.velocity.y += dy * pullStrength;
        
        // Enhanced horizontal control while swinging
        if (cursors.left.isDown) {
          player.body.velocity.x -= 30;
        } else if (cursors.right.isDown) {
          player.body.velocity.x += 30;
        }
        
        // Rope length limiting with spring effect
        const maxRopeLength = 350;
        if (dist > maxRopeLength) {
          const pushFactor = (dist - maxRopeLength) * 0.15;
          const elasticity = 0.7 + Math.abs(springVelocity) * 0.1;
          player.body.velocity.x -= (dx / dist) * pushFactor * elasticity;
          player.body.velocity.y -= (dy / dist) * pushFactor * elasticity;
        }
        
        // Speed cap with direction preservation
        const maxSpeed = 1200;
        const currentSpeed = Math.sqrt(
          player.body.velocity.x * player.body.velocity.x +
          player.body.velocity.y * player.body.velocity.y
        );
        if (currentSpeed > maxSpeed) {
          const reduction = maxSpeed / currentSpeed;
          player.body.velocity.x *= reduction;
          player.body.velocity.y *= reduction;
        }
    }
}
  
// Add resize handler
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
  
// Add shake function after the game creation
function addScreenShake(scene, intensity = 1) {
    const duration = 100;
    const ease = 'Cubic.easeOut';
    const fromRight = Phaser.Math.Between(-1, 1) * intensity;
    const fromBottom = Phaser.Math.Between(-1, 1) * intensity;

    scene.cameras.main.shake(duration, 0.005 * intensity);
}
  