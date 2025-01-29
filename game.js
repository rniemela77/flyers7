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

const game = new Phaser.Game(config);

let playerUnits;
let enemyUnits;
let selectionRect;
let selectionStart = { x: 0, y: 0 };
let selectedUnits = [];
let graphics;
let attackMoveIndicator;
let groupSelectionRect;
let currentSquad = [];
let squadTargetX = null;
let squadTargetY = null;
let isSquadAttackMoving = false;
let playerSquads = [];
let selectedSquadIndex = -1;
let activeSquadTargets = [
    { x: null, y: null, isAttackMoving: false },
    { x: null, y: null, isAttackMoving: false }
];

function preload() {
    // We'll use simple shapes for now, so no assets needed
}

function create() {
    graphics = this.add.graphics();
    attackMoveIndicator = this.add.graphics();
    groupSelectionRect = this.add.graphics();
    
    // Create player units group with collision
    playerUnits = this.physics.add.group({
        bounceX: 0.1,
        bounceY: 0.1,
        collideWorldBounds: true,
        dragX: 0.9,
        dragY: 0.9
    });
    
    // Create enemy units group with collision
    enemyUnits = this.physics.add.group({
        bounceX: 0.1,
        bounceY: 0.1,
        collideWorldBounds: true,
        dragX: 0.9,
        dragY: 0.9
    });
    
    // Create two player squads
    const squad1 = spawnSquad(this, playerUnits, 5, 100, 100, 0x00ff00);
    const squad2 = spawnSquad(this, playerUnits, 5, 100, 400, 0x00ff00);
    playerSquads = [squad1, squad2];
    
    // Spawn enemy squad
    spawnUnits(this, enemyUnits, 5, 700, 300, 0xff0000);
    
    // Store scene reference for combat handling
    this.combatEffects = this.add.graphics();
    
    // Enable collisions between units with some separation
    this.physics.add.collider(playerUnits, playerUnits, separateUnits);
    this.physics.add.collider(enemyUnits, enemyUnits, separateUnits);
    
    // Only handle melee combat on collision
    this.physics.add.collider(playerUnits, enemyUnits, (playerUnit, enemyUnit) => {
        // Only process melee combat on collision
        if (!playerUnit.isRanged && !enemyUnit.isRanged) {
            handleCombat.call(this, playerUnit, enemyUnit);
        }
        // Always separate units to prevent stacking
        separateUnits(playerUnit, enemyUnit);
    });
    
    // Track drag state
    this.dragStart = null;
    this.isDragging = false;
    
    // Input handling for drag and tap
    this.input.on('pointerdown', (pointer) => {
        // Check if we clicked on a unit
        playerSquads.forEach((squad, index) => {
            const clickedUnits = squad.filter(unit => {
                if (!unit || !unit.active || !unit.body) return false;
                const distance = Phaser.Math.Distance.Between(
                    unit.x, unit.y,
                    pointer.x, pointer.y
                );
                return distance <= 50;
            });
            
            if (clickedUnits.length > 0) {
                // Select this squad
                clearSelection();
                selectedSquadIndex = index;
                currentSquad = squad;
                squad.forEach(unit => {
                    if (unit && unit.active) {
                        selectUnit(unit);
                    }
                });
                updateGroupSelectionRect();
                
                // Start drag if we clicked on the selected squad
                this.dragStart = { x: pointer.x, y: pointer.y };
                this.isDragging = true;
            }
        });
        
        // If we didn't click any squad, deselect
        if (selectedSquadIndex === -1) {
            clearSelection();
            currentSquad = [];
        }
    });
    
    this.input.on('pointermove', (pointer) => {
        if (this.isDragging && selectedUnits.length > 0) {
            // Draw drag line
            graphics.clear();
            graphics.lineStyle(2, 0xff0000);
            graphics.beginPath();
            graphics.moveTo(this.dragStart.x, this.dragStart.y);
            graphics.lineTo(pointer.x, pointer.y);
            graphics.strokePath();
        }
    });
    
    this.input.on('pointerup', (pointer) => {
        if (this.isDragging && selectedUnits.length > 0) {
            // Issue attack-move command
            moveSelectedUnits(pointer.x, pointer.y, true);
            graphics.clear();
        }
        
        this.dragStart = null;
        this.isDragging = false;
    });
}

function handleTapSelection(pointer) {
    // Get all units at the clicked position
    const clickedPlayerUnits = getUnitsAtPosition(playerUnits, pointer.x, pointer.y, 50);
    
    if (clickedPlayerUnits.length > 0) {
        // Get the center of the clicked units
        const clickedCenter = getGroupCenter(clickedPlayerUnits);
        
        // If we already have these units selected, deselect them
        if (selectedUnits.length > 0 && 
            clickedPlayerUnits.some(unit => selectedUnits.includes(unit))) {
            clearSelection();
        } else {
            // Otherwise, select the new squad
            clearSelection();
            
            // Find all units within squad range of this center
            const squadRadius = 150;
            playerUnits.getChildren().forEach(unit => {
                if (!unit || !unit.active || !unit.body) return;
                
                const distanceToCenter = Phaser.Math.Distance.Between(
                    unit.x, unit.y,
                    clickedCenter.x, clickedCenter.y
                );
                if (distanceToCenter <= squadRadius) {
                    selectUnit(unit);
                }
            });
            
            updateGroupSelectionRect();
        }
    } else {
        // Clicked empty space - deselect
        clearSelection();
    }
}

function getUnitsAtPosition(group, x, y, radius = 50) {
    const units = [];
    group.getChildren().forEach(unit => {
        if (!unit || !unit.active || !unit.body) return;
        
        const distance = Phaser.Math.Distance.Between(unit.x, unit.y, x, y);
        if (distance <= radius) {
            units.push(unit);
        }
    });
    return units;
}

function getGroupCenter(units) {
    // Filter out any invalid units first
    const validUnits = units.filter(unit => unit && unit.active && unit.body);
    
    if (!validUnits.length) return { x: 0, y: 0 };
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    validUnits.forEach(unit => {
        minX = Math.min(minX, unit.x);
        minY = Math.min(minY, unit.y);
        maxX = Math.max(maxX, unit.x);
        maxY = Math.max(maxY, unit.y);
    });
    
    return {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
    };
}

function updateGroupSelectionRect() {
    groupSelectionRect.clear();
    
    // Clean up any destroyed units from selection
    selectedUnits = selectedUnits.filter(unit => {
        return unit && unit.active && unit.body && typeof unit.x === 'number' && typeof unit.y === 'number';
    });
    
    if (selectedUnits.length === 0) return;
    
    // Calculate bounds of selected units
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    selectedUnits.forEach(unit => {
        // Skip invalid units
        if (!unit || !unit.active) return;
        
        // Use unit position and size directly instead of body bounds
        const halfWidth = unit.width / 2;
        const halfHeight = unit.height / 2;
        
        minX = Math.min(minX, unit.x - halfWidth);
        minY = Math.min(minY, unit.y - halfHeight);
        maxX = Math.max(maxX, unit.x + halfWidth);
        maxY = Math.max(maxY, unit.y + halfHeight);
    });
    
    // Only draw if we have valid bounds
    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
        return;
    }
    
    // Add padding
    const padding = 15;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    
    // Draw selection rectangle with rounded corners
    groupSelectionRect.clear();
    groupSelectionRect.lineStyle(2, 0xffffff, 0.8);
    
    // Draw main rectangle
    groupSelectionRect.strokeRoundedRect(
        minX, minY,
        maxX - minX,
        maxY - minY,
        8 // corner radius
    );
    
    // Add a subtle glow effect
    groupSelectionRect.lineStyle(4, 0xffffff, 0.2);
    groupSelectionRect.strokeRoundedRect(
        minX - 2, minY - 2,
        maxX - minX + 4,
        maxY - minY + 4,
        10
    );
}

function createHealthBar(scene, unit) {
    const width = unit.width; // Match unit width
    const height = 4;
    const yOffset = -15; // Position above unit
    
    // Create container for health bar
    const healthBar = scene.add.graphics();
    
    // Update function for the health bar
    const updateHealthBar = () => {
        healthBar.clear();
        
        // Position relative to unit's left side
        const barX = unit.x - unit.width/2;
        const barY = unit.y + yOffset;
        
        // Background (red)
        healthBar.fillStyle(0xff0000);
        healthBar.fillRect(barX, barY, width, height);
        
        // Health (green)
        const healthWidth = Math.max(0, (unit.health / unit.maxHealth) * width);
        healthBar.fillStyle(0x00ff00);
        healthBar.fillRect(barX, barY, healthWidth, height);
        
        // Border
        healthBar.lineStyle(1, 0x000000);
        healthBar.strokeRect(barX, barY, width, height);
    };
    
    // Store the update function on the unit
    unit.updateHealthBar = updateHealthBar;
    
    return healthBar;
}

function spawnUnits(scene, group, count, x, y, color) {
    for (let i = 0; i < count; i++) {
        const unit = scene.add.rectangle(
            x + Phaser.Math.Between(-50, 50),
            y + Phaser.Math.Between(-50, 50),
            20,
            20,
            color
        );
        
        scene.physics.add.existing(unit);
        
        // Configure physics body
        unit.body.setCollideWorldBounds(true);
        unit.body.setBounce(0.1);
        unit.body.setMass(1);
        unit.body.setFriction(0.9);
        unit.body.setDrag(0.9);
        
        // Set a circular body for better unit movement
        const bodyRadius = 12;
        unit.body.setCircle(bodyRadius, 
            (unit.width - bodyRadius * 2) / 2, 
            (unit.height - bodyRadius * 2) / 2
        );
        
        // Add custom properties
        unit.maxHealth = 100;
        unit.health = unit.maxHealth;
        unit.damage = 10;
        unit.attackRange = 50;
        unit.lastAttack = 0;
        unit.attackCooldown = 1000;
        unit.isAttackMoving = false;
        unit.targetX = null;
        unit.targetY = null;
        unit.attackMoveRange = 200;
        
        // Add selection indicator (initially invisible)
        unit.selectionCircle = scene.add.circle(unit.x, unit.y, 15, 0xffff00, 0);
        
        // Add health bar
        unit.healthBar = createHealthBar(scene, unit);
        
        group.add(unit);
    }
}

function selectUnit(unit) {
    selectedUnits.push(unit);
    unit.selectionCircle.setAlpha(1);
}

function clearSelection() {
    selectedUnits.forEach(unit => {
        if (unit && unit.active && unit.selectionCircle) {
            unit.selectionCircle.setAlpha(0);
        }
    });
    selectedUnits = [];
    selectedSquadIndex = -1;
    groupSelectionRect.clear();
}

function getFormationOffset(index, totalUnits) {
    // Increase spacing to prevent overcrowding
    const spacing = 25; // Increased from 15 to give more room
    const columns = Math.ceil(Math.sqrt(totalUnits));
    const rows = Math.ceil(totalUnits / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    // Add slight randomness to prevent perfect grid alignment
    const randomOffset = {
        x: Phaser.Math.Between(-5, 5),
        y: Phaser.Math.Between(-5, 5)
    };
    
    // Center the formation around (0,0)
    return {
        x: (col - (columns - 1) / 2) * spacing + randomOffset.x,
        y: (row - (rows - 1) / 2) * spacing + randomOffset.y
    };
}

function moveSelectedUnits(targetX, targetY, isAttackMove = false) {
    if (selectedSquadIndex === -1 || !playerSquads[selectedSquadIndex]) return;
    
    // Filter out any destroyed units from the current squad
    playerSquads[selectedSquadIndex] = playerSquads[selectedSquadIndex].filter(
        unit => unit && unit.active && unit.body
    );
    currentSquad = playerSquads[selectedSquadIndex];
    
    if (currentSquad.length === 0) return;
    
    // Store squad-wide target and state for the specific squad
    activeSquadTargets[selectedSquadIndex] = {
        x: targetX,
        y: targetY,
        isAttackMoving: isAttackMove
    };
    
    // Assign formation positions
    currentSquad.forEach((unit, index) => {
        if (!unit || !unit.active || !unit.body) return;
        
        const offset = getFormationOffset(index, currentSquad.length);
        unit.formationOffset = offset;
        unit.squadIndex = index;
    });
}

function attackMoveToLocation(x, y) {
    moveSelectedUnits(x, y, true);
}

function showAttackMoveIndicator(x, y) {
    attackMoveIndicator.clear();
    attackMoveIndicator.lineStyle(2, 0xff0000);
    
    // Draw an X at the target location
    const size = 20;
    attackMoveIndicator.beginPath();
    attackMoveIndicator.moveTo(x - size, y - size);
    attackMoveIndicator.lineTo(x + size, y + size);
    attackMoveIndicator.moveTo(x + size, y - size);
    attackMoveIndicator.lineTo(x - size, y + size);
    attackMoveIndicator.strokePath();
    
    // Fade out the indicator
    attackMoveIndicator.alpha = 1;
    game.scene.scenes[0].tweens.add({
        targets: attackMoveIndicator,
        alpha: 0,
        duration: 1000,
        ease: 'Power2'
    });
}

function handleCombat(playerUnit, enemyUnit) {
    // First check if either unit is already destroyed
    if (!playerUnit || !playerUnit.active || !enemyUnit || !enemyUnit.active) return;
    
    const currentTime = game.getTime();
    
    // Calculate distance between units
    const distance = Phaser.Math.Distance.Between(
        playerUnit.x, playerUnit.y,
        enemyUnit.x, enemyUnit.y
    );
    
    // Player unit attacks enemy if in range (no collision check needed for ranged units)
    if ((playerUnit.isRanged || distance <= playerUnit.attackRange) && 
        currentTime - playerUnit.lastAttack >= playerUnit.attackCooldown) {
        enemyUnit.health -= playerUnit.damage;
        playerUnit.lastAttack = currentTime;
        
        // Visual feedback for player's attack
        this.combatEffects.clear();
        if (playerUnit.isRanged) {
            // Draw projectile line for ranged attack
            this.combatEffects.lineStyle(2, 0x00ffff);
            this.combatEffects.beginPath();
            this.combatEffects.moveTo(playerUnit.x, playerUnit.y);
            this.combatEffects.lineTo(enemyUnit.x, enemyUnit.y);
            this.combatEffects.strokePath();
        } else {
            // Melee attack circle
            this.combatEffects.lineStyle(2, 0xffff00);
            this.combatEffects.strokeCircle(enemyUnit.x, enemyUnit.y, 10);
        }
        
        // Fade out effect
        this.tweens.add({
            targets: this.combatEffects,
            alpha: 0,
            duration: playerUnit.isRanged ? 200 : 100,
            onComplete: () => {
                this.combatEffects.clear();
                this.combatEffects.alpha = 1;
            }
        });
    }
    
    // Enemy unit attacks back if in range (no collision check needed for ranged units)
    if ((enemyUnit.isRanged || distance <= enemyUnit.attackRange) && 
        currentTime - enemyUnit.lastAttack >= enemyUnit.attackCooldown) {
        playerUnit.health -= enemyUnit.damage;
        enemyUnit.lastAttack = currentTime;
        
        // Visual feedback for enemy's attack
        this.combatEffects.clear();
        if (enemyUnit.isRanged) {
            // Draw projectile line for ranged attack
            this.combatEffects.lineStyle(2, 0xff00ff);  // Magenta for enemy ranged attacks
            this.combatEffects.beginPath();
            this.combatEffects.moveTo(enemyUnit.x, enemyUnit.y);
            this.combatEffects.lineTo(playerUnit.x, playerUnit.y);
            this.combatEffects.strokePath();
        } else {
            // Melee attack circle
            this.combatEffects.lineStyle(2, 0xffffff);
            this.combatEffects.strokeCircle(playerUnit.x, playerUnit.y, 10);
        }
        
        // Fade out effect
        this.tweens.add({
            targets: this.combatEffects,
            alpha: 0,
            duration: enemyUnit.isRanged ? 200 : 100,
            onComplete: () => {
                this.combatEffects.clear();
                this.combatEffects.alpha = 1;
            }
        });
    }
    
    // After dealing damage, update health bars
    if (playerUnit.updateHealthBar) playerUnit.updateHealthBar();
    if (enemyUnit.updateHealthBar) enemyUnit.updateHealthBar();
    
    // Check for unit death
    if (enemyUnit.health <= 0) {
        const enemyIndex = selectedUnits.indexOf(enemyUnit);
        if (enemyIndex > -1) {
            selectedUnits.splice(enemyIndex, 1);
        }
        if (enemyUnit.selectionCircle) {
            enemyUnit.selectionCircle.destroy();
        }
        if (enemyUnit.healthBar) {
            enemyUnit.healthBar.destroy();
        }
        enemyUnit.destroy();
    }
    if (playerUnit.health <= 0) {
        const playerIndex = selectedUnits.indexOf(playerUnit);
        if (playerIndex > -1) {
            selectedUnits.splice(playerIndex, 1);
        }
        if (playerUnit.selectionCircle) {
            playerUnit.selectionCircle.destroy();
        }
        if (playerUnit.healthBar) {
            playerUnit.healthBar.destroy();
        }
        playerUnit.destroy();
    }
    
    // Update selection rectangle after potential unit destruction
    updateGroupSelectionRect();
}

// Add a separation function to help prevent unit stacking
function separateUnits(unit1, unit2) {
    // Check if both units and their bodies are valid
    if (!unit1 || !unit1.active || !unit1.body || !unit2 || !unit2.active || !unit2.body) {
        return;
    }
    
    const angle = Phaser.Math.Angle.Between(unit1.x, unit1.y, unit2.x, unit2.y);
    const pushForce = 30;
    
    unit1.body.velocity.x -= Math.cos(angle) * pushForce;
    unit1.body.velocity.y -= Math.sin(angle) * pushForce;
    unit2.body.velocity.x += Math.cos(angle) * pushForce;
    unit2.body.velocity.y += Math.sin(angle) * pushForce;
}

function update() {
    // Clean up any destroyed units
    playerSquads = playerSquads.map(squad => 
        squad.filter(unit => unit && unit.active)
    );
    selectedUnits = selectedUnits.filter(unit => unit && unit.active);
    
    // Update selection rectangle
    if (selectedUnits.length > 0) {
        updateGroupSelectionRect();
    }
    
    // Check for ranged combat for all units
    playerUnits.getChildren().forEach(playerUnit => {
        if (!playerUnit || !playerUnit.active) return;
        
        // Only check ranged combat for ranged units
        if (playerUnit.isRanged) {
            enemyUnits.getChildren().forEach(enemyUnit => {
                if (!enemyUnit || !enemyUnit.active) return;
                
                const distance = Phaser.Math.Distance.Between(
                    playerUnit.x, playerUnit.y,
                    enemyUnit.x, enemyUnit.y
                );
                
                if (distance <= playerUnit.attackRange) {
                    handleCombat.call(this, playerUnit, enemyUnit);
                }
            });
        }
    });
    
    // Do the same for enemy ranged units
    enemyUnits.getChildren().forEach(enemyUnit => {
        if (!enemyUnit || !enemyUnit.active) return;
        
        if (enemyUnit.isRanged) {
            playerUnits.getChildren().forEach(playerUnit => {
                if (!playerUnit || !playerUnit.active) return;
                
                const distance = Phaser.Math.Distance.Between(
                    enemyUnit.x, enemyUnit.y,
                    playerUnit.x, playerUnit.y
                );
                
                if (distance <= enemyUnit.attackRange) {
                    handleCombat.call(this, playerUnit, enemyUnit);
                }
            });
        }
    });
    
    // Update all squads
    playerSquads.forEach((squad, squadIndex) => {
        const squadTarget = activeSquadTargets[squadIndex];
        if (!squad.length || !squadTarget.x || !squadTarget.y) return;
        
        const squadCenter = getGroupCenter(squad);
        
        squad.forEach(unit => {
            if (!unit || !unit.active || !unit.body) return;
            
            // Update selection circle
            if (unit.selectionCircle) {
                unit.selectionCircle.setPosition(unit.x, unit.y);
            }
            
            if (squadTarget.isAttackMoving) {
                // Check for nearby enemies
                let nearestEnemy = null;
                let nearestDistance = unit.attackMoveRange;
                
                enemyUnits.getChildren().forEach(enemy => {
                    if (!enemy || !enemy.active) return;
                    const distance = Phaser.Math.Distance.Between(
                        unit.x, unit.y, enemy.x, enemy.y
                    );
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestEnemy = enemy;
                    }
                });
                
                if (nearestEnemy) {
                    // Calculate distance to enemy
                    const distanceToEnemy = Phaser.Math.Distance.Between(
                        unit.x, unit.y,
                        nearestEnemy.x, nearestEnemy.y
                    );
                    
                    if (unit.isRanged) {
                        // Ranged units try to maintain optimal range
                        const optimalRange = unit.attackRange * 0.8; // Stay at 80% of max range
                        
                        if (distanceToEnemy < optimalRange - 20) {
                            // Too close, back away
                            const angle = Phaser.Math.Angle.Between(
                                nearestEnemy.x, nearestEnemy.y,
                                unit.x, unit.y
                            );
                            unit.body.setVelocity(
                                Math.cos(angle) * 100,
                                Math.sin(angle) * 100
                            );
                        } else if (distanceToEnemy > optimalRange + 20) {
                            // Too far, move closer
                            const angle = Phaser.Math.Angle.Between(
                                unit.x, unit.y,
                                nearestEnemy.x, nearestEnemy.y
                            );
                            unit.body.setVelocity(
                                Math.cos(angle) * 100,
                                Math.sin(angle) * 100
                            );
                        } else {
                            // At good range, stop moving
                            unit.body.setVelocity(0, 0);
                        }
                    } else {
                        // Melee units behave as before
                        const angle = Phaser.Math.Angle.Between(
                            unit.x, unit.y,
                            nearestEnemy.x, nearestEnemy.y
                        );
                        unit.body.setVelocity(
                            Math.cos(angle) * 100,
                            Math.sin(angle) * 100
                        );
                    }
                } else {
                    // Move to formation position
                    const formationX = squadTarget.x + unit.formationOffset.x;
                    const formationY = squadTarget.y + unit.formationOffset.y;
                    
                    const distToTarget = Phaser.Math.Distance.Between(
                        unit.x, unit.y,
                        formationX, formationY
                    );
                    
                    // Increase stopping distance to prevent jiggling
                    if (distToTarget > 20) {
                        const angle = Phaser.Math.Angle.Between(
                            unit.x, unit.y,
                            formationX, formationY
                        );
                        
                        // Slow down when getting close to target
                        const speed = distToTarget > 50 ? 100 : 50;
                        
                        unit.body.setVelocity(
                            Math.cos(angle) * speed,
                            Math.sin(angle) * speed
                        );
                    } else {
                        // Come to a complete stop
                        unit.body.setVelocity(0, 0);
                        // Add some drag to prevent sliding
                        unit.body.setDrag(0.95);
                    }
                }
            }
            
            // Update health bar position and fill
            if (unit.updateHealthBar) {
                unit.updateHealthBar();
            }
        });
    });
    
    // Enemy behavior
    if (enemyUnits.getChildren().length > 0) {
        const enemySquadCenter = getGroupCenter(enemyUnits.getChildren());
        
        enemyUnits.getChildren().forEach(enemyUnit => {
            if (!enemyUnit || !enemyUnit.active) return;
            
            // Find nearest player unit
            let nearestPlayerUnit = null;
            let nearestDistance = Infinity;
            
            playerUnits.getChildren().forEach(playerUnit => {
                if (!playerUnit || !playerUnit.active) return;
                const distance = Phaser.Math.Distance.Between(
                    enemyUnit.x, enemyUnit.y,
                    playerUnit.x, playerUnit.y
                );
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayerUnit = playerUnit;
                }
            });
            
            if (nearestPlayerUnit && nearestDistance > 40) {
                // Move toward nearest player while staying near squad
                const angleToTarget = Phaser.Math.Angle.Between(
                    enemyUnit.x, enemyUnit.y,
                    nearestPlayerUnit.x, nearestPlayerUnit.y
                );
                
                enemyUnit.body.setVelocity(
                    Math.cos(angleToTarget) * 50,
                    Math.sin(angleToTarget) * 50
                );
            } else {
                enemyUnit.body.setVelocity(0, 0);
            }
            
            // Update health bar position and fill
            if (enemyUnit.updateHealthBar) {
                enemyUnit.updateHealthBar();
            }
        });
    }
    
    // Update enemy health bars
    enemyUnits.getChildren().forEach(unit => {
        if (!unit || !unit.active) return;
        if (unit.updateHealthBar) {
            unit.updateHealthBar();
        }
    });
}

function spawnSquad(scene, group, count, x, y, color) {
    const squad = [];
    // Determine number of ranged units (1-3)
    const numRangedUnits = Phaser.Math.Between(1, Math.min(3, count));
    
    for (let i = 0; i < count; i++) {
        const isRanged = i < numRangedUnits;
        const unitColor = isRanged ? 0x00ffff : color; // Cyan for ranged units
        
        const unit = scene.add.rectangle(
            x + Phaser.Math.Between(-50, 50),
            y + Phaser.Math.Between(-50, 50),
            20,
            20,
            unitColor
        );
        
        scene.physics.add.existing(unit);
        
        // Configure physics body
        unit.body.setCollideWorldBounds(true);
        unit.body.setBounce(0.1);
        unit.body.setMass(1);
        unit.body.setFriction(0.9);
        unit.body.setDrag(0.9);
        
        // Set a circular body for better unit movement
        const bodyRadius = 12;
        unit.body.setCircle(bodyRadius, 
            (unit.width - bodyRadius * 2) / 2, 
            (unit.height - bodyRadius * 2) / 2
        );
        
        // Add custom properties with different values for ranged units
        unit.isRanged = isRanged;
        unit.maxHealth = isRanged ? 70 : 100; // Store max health
        unit.health = unit.maxHealth; // Current health starts at max
        unit.damage = isRanged ? 15 : 10;
        unit.attackRange = isRanged ? 200 : 50;
        unit.lastAttack = 0;
        unit.attackCooldown = isRanged ? 1500 : 1000;
        unit.isAttackMoving = false;
        unit.targetX = null;
        unit.targetY = null;
        unit.attackMoveRange = isRanged ? 250 : 200;
        
        // Add selection indicator (initially invisible)
        unit.selectionCircle = scene.add.circle(unit.x, unit.y, 15, 0xffff00, 0);
        
        // Add health bar
        unit.healthBar = createHealthBar(scene, unit);
        
        group.add(unit);
        squad.push(unit);
    }
    return squad;
}
  