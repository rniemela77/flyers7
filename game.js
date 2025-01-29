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
    
    // Spawn initial units
    spawnUnits(this, playerUnits, 5, 100, 300, 0x00ff00);
    spawnUnits(this, enemyUnits, 5, 700, 300, 0xff0000);
    
    // Store scene reference for combat handling
    this.combatEffects = this.add.graphics();
    
    // Enable collisions between units with some separation
    this.physics.add.collider(playerUnits, playerUnits, separateUnits);
    this.physics.add.collider(enemyUnits, enemyUnits, separateUnits);
    this.physics.add.collider(playerUnits, enemyUnits, handleCombat.bind(this));
    
    // Track drag state
    this.dragStart = null;
    
    // Input handling for drag and tap
    this.input.on('pointerdown', (pointer) => {
        this.dragStart = { x: pointer.x, y: pointer.y, time: pointer.time };
    });
    
    this.input.on('pointermove', (pointer) => {
        if (this.dragStart && selectedUnits.length > 0) {
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
        if (!this.dragStart) return;
        
        const dragDistance = Phaser.Math.Distance.Between(
            this.dragStart.x, this.dragStart.y,
            pointer.x, pointer.y
        );
        
        const dragTime = pointer.time - this.dragStart.time;
        
        if (dragDistance > 10 && dragTime > 50) {
            // This was a drag - handle as attack-move if units are selected
            if (selectedUnits.length > 0) {
                moveSelectedUnits(pointer.x, pointer.y, true);
            }
        } else {
            // This was a tap - handle selection
            handleTapSelection(pointer);
        }
        
        // Clear drag visuals
        graphics.clear();
        this.dragStart = null;
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
        unit.health = 100;
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
    groupSelectionRect.clear();
}

function getFormationOffset(index, totalUnits) {
    // Create a much tighter formation
    const spacing = 15; // Reduced spacing between units
    const columns = Math.ceil(Math.sqrt(totalUnits));
    const rows = Math.ceil(totalUnits / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);
    
    // Center the formation around (0,0)
    return {
        x: (col - (columns - 1) / 2) * spacing,
        y: (row - (rows - 1) / 2) * spacing
    };
}

function moveSelectedUnits(targetX, targetY, isAttackMove = false) {
    // Filter out any destroyed units first
    selectedUnits = selectedUnits.filter(unit => unit && unit.active && unit.body);
    
    if (selectedUnits.length === 0) return;
    
    const squadCenter = getGroupCenter(selectedUnits);
    
    selectedUnits.forEach((unit, index) => {
        if (!unit || !unit.active || !unit.body) return;
        
        // Get formation position relative to target center
        const offset = getFormationOffset(index, selectedUnits.length);
        const formationX = targetX + offset.x;
        const formationY = targetY + offset.y;
        
        // Set movement properties
        unit.isAttackMoving = isAttackMove;
        unit.targetX = formationX;
        unit.targetY = formationY;
        unit.squadCenter = squadCenter;
        
        // Calculate direction and set initial velocity
        const angle = Phaser.Math.Angle.Between(unit.x, unit.y, formationX, formationY);
        const speed = 100;
        unit.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    });
    
    if (isAttackMove) {
        showAttackMoveIndicator(targetX, targetY);
    }
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
    
    // Player unit attacks enemy
    if (currentTime - playerUnit.lastAttack >= playerUnit.attackCooldown) {
        enemyUnit.health -= playerUnit.damage;
        playerUnit.lastAttack = currentTime;
        
        // Visual feedback for attack using graphics
        this.combatEffects.clear();
        this.combatEffects.lineStyle(2, 0xffff00);
        this.combatEffects.strokeCircle(enemyUnit.x, enemyUnit.y, 10);
        
        // Fade out effect
        this.tweens.add({
            targets: this.combatEffects,
            alpha: 0,
            duration: 100,
            onComplete: () => {
                this.combatEffects.clear();
                this.combatEffects.alpha = 1;
            }
        });
    }
    
    // Enemy unit attacks back
    if (currentTime - enemyUnit.lastAttack >= enemyUnit.attackCooldown) {
        playerUnit.health -= enemyUnit.damage;
        enemyUnit.lastAttack = currentTime;
    }
    
    // Check for unit death
    if (enemyUnit.health <= 0) {
        // Remove from selection if it was selected
        const enemyIndex = selectedUnits.indexOf(enemyUnit);
        if (enemyIndex > -1) {
            selectedUnits.splice(enemyIndex, 1);
        }
        if (enemyUnit.selectionCircle) {
            enemyUnit.selectionCircle.destroy();
        }
        enemyUnit.destroy();
    }
    if (playerUnit.health <= 0) {
        // Remove from selection if it was selected
        const playerIndex = selectedUnits.indexOf(playerUnit);
        if (playerIndex > -1) {
            selectedUnits.splice(playerIndex, 1);
        }
        if (playerUnit.selectionCircle) {
            playerUnit.selectionCircle.destroy();
        }
        playerUnit.destroy();
    }
    
    // Update selection rectangle after potential unit destruction
    updateGroupSelectionRect();
}

// Add a separation function to help prevent unit stacking
function separateUnits(unit1, unit2) {
    const angle = Phaser.Math.Angle.Between(unit1.x, unit1.y, unit2.x, unit2.y);
    const pushForce = 30;
    
    unit1.body.velocity.x -= Math.cos(angle) * pushForce;
    unit1.body.velocity.y -= Math.sin(angle) * pushForce;
    unit2.body.velocity.x += Math.cos(angle) * pushForce;
    unit2.body.velocity.y += Math.sin(angle) * pushForce;
}

function update() {
    // Clean up any destroyed units from selection
    selectedUnits = selectedUnits.filter(unit => unit && unit.active);
    
    // Always update selection rectangle if units are selected
    if (selectedUnits.length > 0) {
        updateGroupSelectionRect();
        
        // Calculate current squad center
        const currentSquadCenter = getGroupCenter(selectedUnits);
        
        // Update unit positions to maintain squad cohesion
        selectedUnits.forEach((unit, index) => {
            if (!unit || !unit.active || !unit.body) return;
            
            // Get ideal formation position relative to current squad center
            const offset = getFormationOffset(index, selectedUnits.length);
            const idealX = unit.targetX;
            const idealY = unit.targetY;
            
            // Calculate distances
            const distToTarget = Phaser.Math.Distance.Between(
                unit.x, unit.y,
                idealX, idealY
            );
            
            const distToSquadCenter = Phaser.Math.Distance.Between(
                unit.x, unit.y,
                currentSquadCenter.x, currentSquadCenter.y
            );
            
            // Calculate angles
            const angleToTarget = Phaser.Math.Angle.Between(
                unit.x, unit.y,
                idealX, idealY
            );
            
            const angleToSquadCenter = Phaser.Math.Angle.Between(
                unit.x, unit.y,
                currentSquadCenter.x, currentSquadCenter.y
            );
            
            // Strong cohesion force when units are too far from squad center
            const maxSquadSpread = 50; // Reduced spread distance
            const cohesionStrength = Math.min((distToSquadCenter - maxSquadSpread) / 30, 1);
            
            // Blend movement between target position and squad cohesion
            let finalAngle = angleToTarget;
            let speed = 100;
            
            if (distToSquadCenter > maxSquadSpread) {
                // Strong pull toward squad center when too far
                finalAngle = Phaser.Math.Angle.Wrap(
                    angleToTarget * (1 - cohesionStrength) + 
                    angleToSquadCenter * cohesionStrength
                );
                // Increase speed when far from squad to catch up
                speed = 100 + (cohesionStrength * 50);
            }
            
            // Apply movement
            if (distToTarget > 5) {
                unit.body.setVelocity(
                    Math.cos(finalAngle) * speed,
                    Math.sin(finalAngle) * speed
                );
            } else {
                // Slow down when near target position
                unit.body.setVelocity(0, 0);
            }
        });
    }
    
    // Update selection circles and handle combat
    playerUnits.getChildren().forEach(unit => {
        if (!unit || !unit.active || !unit.selectionCircle) return;
        
        unit.selectionCircle.setPosition(unit.x, unit.y);
        
        // Handle attack-move behavior
        if (unit.isAttackMoving) {
            let nearestEnemy = null;
            let nearestDistance = unit.attackMoveRange;
            
            enemyUnits.getChildren().forEach(enemy => {
                if (!enemy || !enemy.active) return;
                
                const distance = Phaser.Math.Distance.Between(
                    unit.x, unit.y,
                    enemy.x, enemy.y
                );
                
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            
            if (nearestEnemy && selectedUnits.length > 0) {
                const currentSquadCenter = getGroupCenter(selectedUnits);
                const distFromCenter = Phaser.Math.Distance.Between(
                    unit.x, unit.y,
                    currentSquadCenter.x, currentSquadCenter.y
                );
                
                const angleToEnemy = Phaser.Math.Angle.Between(
                    unit.x, unit.y,
                    nearestEnemy.x, nearestEnemy.y
                );
                
                const angleToCenter = Phaser.Math.Angle.Between(
                    unit.x, unit.y,
                    currentSquadCenter.x, currentSquadCenter.y
                );
                
                // Stronger squad cohesion during combat
                const maxCombatSpread = 40; // Even tighter formation in combat
                const cohesionStrength = Math.min((distFromCenter - maxCombatSpread) / 30, 1);
                const blendedAngle = Phaser.Math.Angle.Wrap(
                    angleToEnemy * (1 - cohesionStrength) + angleToCenter * cohesionStrength
                );
                
                const speed = 100;
                unit.body.setVelocity(
                    Math.cos(blendedAngle) * speed,
                    Math.sin(blendedAngle) * speed
                );
            }
        }
    });
    
    // Enemy squad behavior
    if (enemyUnits.getChildren().length > 0) {
        const enemySquadCenter = getGroupCenter(enemyUnits.getChildren());
        const maxEnemySpread = 60; // Slightly looser than player units
        
        enemyUnits.getChildren().forEach(enemyUnit => {
            if (!enemyUnit || !enemyUnit.active) return;
            
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
            
            if (nearestPlayerUnit) {
                // Calculate distances and angles
                const distToSquadCenter = Phaser.Math.Distance.Between(
                    enemyUnit.x, enemyUnit.y,
                    enemySquadCenter.x, enemySquadCenter.y
                );
                
                const angleToTarget = Phaser.Math.Angle.Between(
                    enemyUnit.x, enemyUnit.y,
                    nearestPlayerUnit.x, nearestPlayerUnit.y
                );
                
                const angleToSquadCenter = Phaser.Math.Angle.Between(
                    enemyUnit.x, enemyUnit.y,
                    enemySquadCenter.x, enemySquadCenter.y
                );
                
                // Calculate cohesion strength based on distance from squad center
                const cohesionStrength = Math.min((distToSquadCenter - maxEnemySpread) / 30, 1);
                
                // Blend between target and squad center
                let finalAngle = angleToTarget;
                let speed = 50; // Base enemy speed
                
                if (distToSquadCenter > maxEnemySpread) {
                    // Strong pull toward squad center when too far
                    finalAngle = Phaser.Math.Angle.Wrap(
                        angleToTarget * (1 - cohesionStrength) + 
                        angleToSquadCenter * cohesionStrength
                    );
                    // Speed up to catch up with squad
                    speed = 50 + (cohesionStrength * 30);
                }
                
                // Only move if not too close to target
                const distToTarget = Phaser.Math.Distance.Between(
                    enemyUnit.x, enemyUnit.y,
                    nearestPlayerUnit.x, nearestPlayerUnit.y
                );
                
                if (distToTarget > 40) { // Keep some distance from target
                    enemyUnit.body.setVelocity(
                        Math.cos(finalAngle) * speed,
                        Math.sin(finalAngle) * speed
                    );
                } else {
                    // If close to target, just stop
                    enemyUnit.body.setVelocity(0, 0);
                }
            } else {
                // If no target, move toward squad center if too far
                const distToSquadCenter = Phaser.Math.Distance.Between(
                    enemyUnit.x, enemyUnit.y,
                    enemySquadCenter.x, enemySquadCenter.y
                );
                
                if (distToSquadCenter > maxEnemySpread) {
                    const angleToCenter = Phaser.Math.Angle.Between(
                        enemyUnit.x, enemyUnit.y,
                        enemySquadCenter.x, enemySquadCenter.y
                    );
                    const speed = 50;
                    enemyUnit.body.setVelocity(
                        Math.cos(angleToCenter) * speed,
                        Math.sin(angleToCenter) * speed
                    );
                } else {
                    enemyUnit.body.setVelocity(0, 0);
                }
            }
        });
    }
}
  