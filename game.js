// Tower Defense Game using Phaser 3

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Grid configuration
const GRID_SIZE = 40; // Size of each grid cell
const GRID_COLS = 20; // Number of columns in the grid
const GRID_ROWS = 15; // Number of rows in the grid

// Game variables
let game = new Phaser.Game(config);
let path;
let enemies;
let towers;
let bullets;
let nextEnemy = 0;
let score = 0;
let lives = 10;
let scoreText;
let livesText;
let gameOver = false;
let gold = 100;
let goldText;
let healthBars; // Group for health bars
let currentScene; // Global scene reference
let grid = []; // 2D array to represent the grid
let gridGraphics; // Graphics object for the grid
let cellHighlight; // Highlight for the current grid cell under the mouse

// Path definition (using grid coordinates)
const pathCoordinates = [
    {x: 0, y: 3},  // Start point
    {x: 5, y: 3},  // First corner
    {x: 5, y: 10}, // Second corner
    {x: 15, y: 10}, // Third corner
    {x: 15, y: 3}, // Fourth corner
    {x: 20, y: 3}  // End point
];

// Preload game assets
function preload() {
    // Removing the space background
    // this.load.image('background', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/skies/space3.png');
    this.load.image('enemy', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/asteroid.png');
    this.load.image('tower', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullet.png');
    this.load.image('bullet', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/bullets/bullet7.png');
}

// Create game objects
function create() {
    // Store global scene reference
    currentScene = this;
    
    // Replace background image with a solid color
    this.cameras.main.setBackgroundColor('#333333');
    
    // Initialize the grid
    initializeGrid();
    
    // Draw the grid
    drawGrid();
    
    // Create path for enemies based on grid coordinates
    createPath();
    
    // Create groups
    enemies = this.physics.add.group();
    towers = this.physics.add.group();
    bullets = this.physics.add.group();
    healthBars = this.add.group();
    
    // Setup UI
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '24px', fill: '#fff' });
    livesText = this.add.text(16, 50, 'Lives: 10', { fontSize: '24px', fill: '#fff' });
    goldText = this.add.text(16, 84, 'Gold: 100', { fontSize: '24px', fill: '#fff' });
    
    // Create cell highlight that follows the mouse
    cellHighlight = this.add.rectangle(0, 0, GRID_SIZE, GRID_SIZE, 0xffffff, 0.3);
    cellHighlight.setStrokeStyle(2, 0xffffff, 0.8);
    cellHighlight.setVisible(false);
    
    // Track mouse movement to update cell highlight
    this.input.on('pointermove', (pointer) => {
        const gridX = Math.floor(pointer.x / GRID_SIZE);
        const gridY = Math.floor(pointer.y / GRID_SIZE);
        
        // Only show highlight if within grid bounds
        if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
            cellHighlight.setPosition(gridX * GRID_SIZE + GRID_SIZE / 2, gridY * GRID_SIZE + GRID_SIZE / 2);
            cellHighlight.setVisible(true);
            
            // Change highlight color based on cell type
            if (grid[gridY][gridX] === 1) { // Path
                cellHighlight.setFillStyle(0xff0000, 0.3); // Red for path
                cellHighlight.setStrokeStyle(2, 0xff0000, 0.8);
            } else if (grid[gridY][gridX] === 2) { // Tower
                cellHighlight.setFillStyle(0x0000ff, 0.3); // Blue for tower
                cellHighlight.setStrokeStyle(2, 0x0000ff, 0.8);
            } else { // Empty
                cellHighlight.setFillStyle(0x00ff00, 0.3); // Green for empty
                cellHighlight.setStrokeStyle(2, 0x00ff00, 0.8);
            }
        } else {
            cellHighlight.setVisible(false);
        }
    });
    
    // Hide highlight when mouse leaves game canvas
    this.input.on('pointerout', () => {
        cellHighlight.setVisible(false);
    });
    
    // Tower placement on click
    this.input.on('pointerdown', (pointer) => {
        if (gold >= 50 && !gameOver) {
            // Convert mouse position to grid coordinates
            const gridX = Math.floor(pointer.x / GRID_SIZE);
            const gridY = Math.floor(pointer.y / GRID_SIZE);
            
            // Check if the grid cell is available for tower placement
            if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS && grid[gridY][gridX] === 0) {
                // Place tower at the center of the grid cell
                const towerX = gridX * GRID_SIZE + GRID_SIZE / 2;
                const towerY = gridY * GRID_SIZE + GRID_SIZE / 2;
                
                placeTower(this, towerX, towerY);
                
                // Mark the grid cell as occupied
                grid[gridY][gridX] = 2; // 2 represents a tower
                
                // Update cell highlight color
                cellHighlight.setFillStyle(0x0000ff, 0.3);
                cellHighlight.setStrokeStyle(2, 0x0000ff, 0.8);
                
                gold -= 50;
                goldText.setText('Gold: ' + gold);
            }
        }
    });
    
    // Use overlap instead of collider to prevent physics pushing
    this.physics.add.overlap(bullets, enemies, damageEnemy, null, this);
}

// Initialize the grid with empty cells
function initializeGrid() {
    grid = [];
    for (let y = 0; y < GRID_ROWS; y++) {
        const row = [];
        for (let x = 0; x < GRID_COLS; x++) {
            row.push(0); // 0 represents an empty cell
        }
        grid.push(row);
    }
    
    // Mark path cells as occupied
    for (let i = 0; i < pathCoordinates.length - 1; i++) {
        const start = pathCoordinates[i];
        const end = pathCoordinates[i + 1];
        
        // Mark horizontal path
        if (start.y === end.y) {
            const y = start.y;
            const startX = Math.min(start.x, end.x);
            const endX = Math.max(start.x, end.x);
            
            for (let x = startX; x <= endX; x++) {
                if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
                    grid[y][x] = 1; // 1 represents a path
                }
            }
        }
        // Mark vertical path
        else if (start.x === end.x) {
            const x = start.x;
            const startY = Math.min(start.y, end.y);
            const endY = Math.max(start.y, end.y);
            
            for (let y = startY; y <= endY; y++) {
                if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
                    grid[y][x] = 1; // 1 represents a path
                }
            }
        }
    }
}

// Draw the grid and path
function drawGrid() {
    // Clear any existing graphics
    if (gridGraphics) {
        gridGraphics.clear();
    } else {
        gridGraphics = currentScene.add.graphics();
    }
    
    // Draw grid cells
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            // Draw cell background based on type
            if (grid[y][x] === 1) { // Path cell
                gridGraphics.fillStyle(0x666666, 1); // Darker gray for path
            } else {
                gridGraphics.fillStyle(0x444444, 1); // Dark gray for empty cells
            }
            
            // Fill the cell
            gridGraphics.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            
            // Draw cell border
            gridGraphics.lineStyle(1, 0x222222, 1);
            gridGraphics.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
    }
    
    // Draw path outline
    gridGraphics.lineStyle(3, 0xffffff, 1);
    gridGraphics.beginPath();
    
    // Start at the first path coordinate - center of the cell
    const startPoint = pathCoordinates[0];
    gridGraphics.moveTo(
        startPoint.x * GRID_SIZE + GRID_SIZE / 2, 
        startPoint.y * GRID_SIZE + GRID_SIZE / 2
    );
    
    // Draw lines to each path coordinate - center of each cell
    for (let i = 1; i < pathCoordinates.length; i++) {
        const point = pathCoordinates[i];
        gridGraphics.lineTo(
            point.x * GRID_SIZE + GRID_SIZE / 2, 
            point.y * GRID_SIZE + GRID_SIZE / 2
        );
    }
    
    gridGraphics.strokePath();
}

// Create the path for enemies to follow
function createPath() {
    path = currentScene.add.path();
    
    // Start at the first path coordinate - center of the cell
    const startPoint = pathCoordinates[0];
    path.add(new Phaser.Curves.Line(
        new Phaser.Math.Vector2(
            startPoint.x * GRID_SIZE + GRID_SIZE / 2, 
            startPoint.y * GRID_SIZE + GRID_SIZE / 2
        ),
        new Phaser.Math.Vector2(
            startPoint.x * GRID_SIZE + GRID_SIZE / 2, 
            startPoint.y * GRID_SIZE + GRID_SIZE / 2
        )
    ));
    
    // Add line segments for each path coordinate - center of each cell
    for (let i = 1; i < pathCoordinates.length; i++) {
        const point = pathCoordinates[i];
        path.add(new Phaser.Curves.Line(
            path.getEndPoint(),
            new Phaser.Math.Vector2(
                point.x * GRID_SIZE + GRID_SIZE / 2, 
                point.y * GRID_SIZE + GRID_SIZE / 2
            )
        ));
    }
}

// Game loop
function update(time) {
    if (gameOver) {
        return;
    }
    
    // Spawn enemies
    if (time > nextEnemy) {
        const startPoint = pathCoordinates[0];
        const enemy = enemies.create(
            startPoint.x * GRID_SIZE + GRID_SIZE / 2, 
            startPoint.y * GRID_SIZE + GRID_SIZE / 2, 
            'enemy'
        );
        enemy.setScale(0.5);
        enemy.health = 3;
        enemy.maxHealth = 3;
        
        // Disable physics body from affecting movement since we're using tweens
        enemy.body.setImmovable(true);
        enemy.body.allowGravity = false;
        
        // Create health bar for this enemy
        const healthBarWidth = 30;
        const healthBarHeight = 4;
        const healthBarBackground = this.add.rectangle(
            enemy.x, 
            enemy.y - 20, 
            healthBarWidth, 
            healthBarHeight, 
            0x000000
        );
        const healthBar = this.add.rectangle(
            enemy.x - healthBarWidth/2, 
            enemy.y - 20, 
            healthBarWidth, 
            healthBarHeight, 
            0x00ff00
        );
        healthBar.setOrigin(0, 0.5);
        
        // Store references to health bars
        enemy.healthBarBackground = healthBarBackground;
        enemy.healthBar = healthBar;
        
        // Add health bars to group
        healthBars.add(healthBarBackground);
        healthBars.add(healthBar);
        
        // Create a timeline for the enemy to follow the path
        const timeline = this.tweens.createTimeline();
        
        // Add tweens for each segment of the path
        for (let i = 1; i < pathCoordinates.length; i++) {
            const point = pathCoordinates[i];
            const prevPoint = pathCoordinates[i-1];
            
            // Calculate distance for proportional duration
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy) * GRID_SIZE;
            const duration = distance * 20; // 20ms per pixel
            
            timeline.add({
                targets: enemy,
                x: point.x * GRID_SIZE + GRID_SIZE / 2,
                y: point.y * GRID_SIZE + GRID_SIZE / 2,
                duration: duration,
                ease: 'Linear'
            });
        }
        
        // Handle enemy reaching the end
        timeline.add({
            targets: {},
            duration: 0,
            onComplete: () => {
                // Destroy health bars when enemy reaches the end
                if (enemy.healthBarBackground) {
                    enemy.healthBarBackground.destroy();
                }
                if (enemy.healthBar) {
                    enemy.healthBar.destroy();
                }
                
                enemy.destroy();
                lives--;
                livesText.setText('Lives: ' + lives);
                
                if (lives <= 0) {
                    gameOver = true;
                    this.add.text(400, 300, 'GAME OVER', { 
                        fontSize: '64px', 
                        fill: '#ff0000',
                        fontStyle: 'bold'
                    }).setOrigin(0.5);
                }
            }
        });
        
        // Start the timeline
        timeline.play();
        
        // Update the update function to handle health bar updates
        enemy.update = function() {
            // Update health bar position to follow enemy
            this.healthBarBackground.x = this.x;
            this.healthBarBackground.y = this.y - 20;
            
            this.healthBar.x = this.x - healthBarWidth/2;
            this.healthBar.y = this.y - 20;
            
            // Update health bar width based on current health
            const healthPercentage = this.health / this.maxHealth;
            this.healthBar.width = healthBarWidth * healthPercentage;
            
            // Update health bar color based on health percentage
            if (healthPercentage > 0.6) {
                this.healthBar.fillColor = 0x00ff00; // Green
            } else if (healthPercentage > 0.3) {
                this.healthBar.fillColor = 0xffff00; // Yellow
            } else {
                this.healthBar.fillColor = 0xff0000; // Red
            }
        };
        
        nextEnemy = time + 2000; // Spawn enemy every 2 seconds
    }
    
    // Update all enemies (for health bars)
    enemies.getChildren().forEach(enemy => {
        if (enemy.update) {
            enemy.update();
        }
    });
    
    // Tower shooting logic
    towers.getChildren().forEach(tower => {
        if (time > tower.nextFire && enemies.getChildren().length > 0) {
            // Find closest enemy
            let closestEnemy = null;
            let minDistance = 200; // Tower range
            
            enemies.getChildren().forEach(enemy => {
                const distance = Phaser.Math.Distance.Between(tower.x, tower.y, enemy.x, enemy.y);
                if (distance < minDistance) {
                    closestEnemy = enemy;
                    minDistance = distance;
                }
            });
            
            if (closestEnemy) {
                // Create bullet
                const bullet = bullets.create(tower.x, tower.y, 'bullet');
                bullet.setScale(0.5);
                
                // Configure bullet physics to not push enemies
                bullet.body.setImmovable(false);
                bullet.body.mass = 0.001; // Very low mass
                
                // Move bullet towards enemy
                this.physics.moveToObject(bullet, closestEnemy, 300);
                
                // Destroy bullet after 2 seconds
                this.time.delayedCall(2000, () => {
                    bullet.destroy();
                });
                
                tower.nextFire = time + 1000; // Fire every 1 second
            }
        }
    });
    
    // Update bullets rotation
    bullets.getChildren().forEach(bullet => {
        bullet.rotation = Phaser.Math.Angle.Between(
            bullet.x, bullet.y,
            bullet.body.velocity.x + bullet.x, bullet.body.velocity.y + bullet.y
        );
    });
}

// Place tower at position
function placeTower(scene, x, y) {
    const tower = towers.create(x, y, 'tower');
    tower.setScale(1.5);
    tower.nextFire = 0;
    
    // Visualize tower range
    const rangeCircle = scene.add.circle(x, y, 200, 0xffffff, 0.1);
    tower.rangeCircle = rangeCircle;
}

// Handle enemy damage
function damageEnemy(bullet, enemy) {
    // Get a reference to the scene - try multiple ways to get a valid scene
    const scene = this || bullet.scene || enemy.scene || currentScene;
    
    // Only proceed if we have a valid scene
    if (!scene || !scene.add) {
        console.warn('No valid scene found in damageEnemy');
        bullet.destroy();
        return;
    }
    
    // Create a hit effect
    try {
        const hitEffect = scene.add.circle(bullet.x, bullet.y, 5, 0xffffff, 0.7);
        scene.tweens.add({
            targets: hitEffect,
            alpha: 0,
            scale: 2,
            duration: 300,
            onComplete: () => {
                hitEffect.destroy();
            }
        });
    } catch (e) {
        console.warn('Error creating hit effect:', e);
    }
    
    // Destroy the bullet
    bullet.destroy();
    
    enemy.health--;
    
    // Update health bar immediately after damage
    if (enemy.update) {
        enemy.update();
    }
    
    if (enemy.health <= 0) {
        // Destroy health bars when enemy is destroyed
        if (enemy.healthBarBackground) {
            enemy.healthBarBackground.destroy();
        }
        if (enemy.healthBar) {
            enemy.healthBar.destroy();
        }
        
        // Create a death effect
        try {
            const deathEffect = scene.add.circle(enemy.x, enemy.y, 20, 0xff0000, 0.7);
            scene.tweens.add({
                targets: deathEffect,
                alpha: 0,
                scale: 3,
                duration: 500,
                onComplete: () => {
                    deathEffect.destroy();
                }
            });
        } catch (e) {
            console.warn('Error creating death effect:', e);
        }
        
        enemy.destroy();
        score += 10;
        gold += 25;
        scoreText.setText('Score: ' + score);
        goldText.setText('Gold: ' + gold);
    }
}
