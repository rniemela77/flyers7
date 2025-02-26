import Phaser from 'phaser';

export const GAME_CONFIG = {
    display: {
        width: 400,
        height: 800,
        scale: Phaser.Scale.FIT,
        centerOffset: 20  // Distance from bottom center for projectile spawning
    },
    combat: {
        weapons: {
            rapidFire: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'single',
                    spread: 0
                }
            },
            dualShot: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'dual',
                    offset: 10,
                    spread: 0
                }
            },
            tripleShot: {
                projectile: {
                    type: 'bullet',
                    speed: 400,
                    lifetime: 2000,
                    damage: 10,
                    size: 8,
                    color: 0xFFFFFF,
                    scale: 1
                },
                fireMode: {
                    cooldown: 100,
                    pattern: 'spread',
                    count: 3,
                    spread: Math.PI / 32
                }
            },
            beam: {
                projectile: {
                    type: 'beam',
                    damage: 2,
                    range: 20,
                    width: 6,
                    color: 0xFFFFFF
                },
                fireMode: {
                    cooldown: 100,
                    continuous: true
                },
                visuals: {
                    glowWidth: 6,
                    glowAlpha: 0.3,
                    glowColor: 0x00FFFF
                }
            },
            lockOn: {
                projectile: {
                    type: 'missile',
                    speed: 300,
                    lifetime: 3000,
                    damage: 15,
                    size: 8,
                    color: 0xFF4444,
                    scale: 1.5,
                    turnRate: 0.05
                },
                fireMode: {
                    cooldown: 500,
                    maxTargets: 2,
                    targetingRange: 100,
                    pattern: 'homing'
                },
                visuals: {
                    targetingColor: 0xFF0000
                }
            },
            shotgun: {
                projectile: {
                    type: 'pellet',
                    speed: 900,
                    lifetime: 1500,
                    damage: 14,
                    size: 6,
                    color: 0xFFFFFF,
                    scale: 0.8
                },
                fireMode: {
                    cooldown: 1000,
                    pattern: 'spread',
                    count: 8,
                    baseSpread: Math.PI / 64,
                    distanceSpreadFactor: 1/800
                }
            }
        }
    },
    homeBase: {
        health: 100,
        maxHealth: 100,
        damageFromCollision: 20,
        healthBar: {
            width: 200,
            height: 20,
            margin: 10
        }
    },
    enemy: {
        health: 100,
        movementMargin: 50,
        movementDuration: 1500,
        respawnDelay: 1000,
        healthBar: {
            width: 40,
            height: 5,
            yOffset: 5
        }
    },
    ui: {
        buttons: {
            width: 40,
            height: 40,
            margin: 10
        }
    }
}; 