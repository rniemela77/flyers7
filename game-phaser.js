// Phaser 3 game implementation

const configScene = {
    hitZonePosition: 0.15,
    hitZoneHeight: 0.4,
    ballRadius: 20,
    ballSpeed: 1,
    spawnInterval: 2000,
    comboDecayTime: 1000,
    hitEffectDuration: 300,
    ballHealth: 100,
    swipeDamage: 50,
    swipeLineDuration: 300,
    swipeLineWidth: 5,
    shieldChance: 0.3,
    maxShields: 3
};

class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        this.score = 0;
        this.combo = 0;
        this.lastComboTime = 0;
        this.ball = null;
        this.projectiles = [];
        this.barrierActive = false;

        this.hitZoneY = this.scale.height * configScene.hitZonePosition;
        this.hitZoneH = this.scale.height * configScene.hitZoneHeight;
        this.hitZoneGraphics = this.add.graphics();
        this.hitZoneGraphics.fillStyle(0xffffff, 0.15);
        this.hitZoneGraphics.fillRect(0, this.hitZoneY, this.scale.width, this.hitZoneH);
        this.hitZoneGraphics.lineStyle(2, 0xffffff, 0.5);
        this.hitZoneGraphics.strokeRect(0, this.hitZoneY, this.scale.width, this.hitZoneH);

        this.barrierY = this.scale.height * 0.75;
        this.barrierGraphics = this.add.graphics();
        this.barrierGraphics.fillStyle(0xffffff, 0.5);
        this.barrierGraphics.fillRect(0, this.barrierY, this.scale.width, 10);
        this.barrierGraphics.setVisible(false);

        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        this.time.addEvent({
            delay: configScene.spawnInterval,
            callback: this.trySpawnBall,
            callbackScope: this,
            loop: true
        });
    }

    trySpawnBall() {
        if (!this.ball) this.createBall();
    }

    createBall() {
        const x = this.scale.width / 2;
        const graphics = this.add.graphics();
        const ball = {
            x,
            y: 0,
            speed: configScene.ballSpeed,
            radius: configScene.ballRadius,
            shielded: Math.random() < configScene.shieldChance,
            shields: 0,
            health: configScene.ballHealth,
            maxHealth: configScene.ballHealth,
            damaged: false,
            damageTimer: 0,
            swingStarted: false,
            swingProgress: 0,
            swingEvent: null,
            graphics
        };
        if (ball.shielded) {
            ball.shields = 1 + Phaser.Math.Between(0, configScene.maxShields - 1);
        }
        this.ball = ball;
    }

    update(time, delta) {
        const dt = delta / 16;

        if (this.ball) {
            const b = this.ball;
            if (!b.swingStarted) {
                if (b.y < this.hitZoneY + this.hitZoneH / 2) b.speed += 0.05;
                else {
                    b.speed = 0;
                    this.startSwingTimer(b);
                }
                b.y += b.speed * dt;
            }

            if (b.damaged) {
                b.damageTimer -= delta;
                if (b.damageTimer <= 0) b.damaged = false;
            }

            if (b.y > this.hitZoneY + this.hitZoneH) this.handleMiss();
            this.renderBall(b);
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.y += p.speed * dt;
            p.graphics.clear();
            p.graphics.fillStyle(0xff0000, 1);
            p.graphics.fillRect(p.x - 2, p.y, 4, 10);
            if ((this.barrierActive && p.y >= this.barrierY) || p.y > this.scale.height) {
                p.graphics.destroy();
                this.projectiles.splice(i, 1);
            }
        }

        this.barrierGraphics.setVisible(this.barrierActive);

        if (time - this.lastComboTime > configScene.comboDecayTime) this.combo = 0;
    }

    renderBall(b) {
        const g = b.graphics;
        g.clear();
        if (b.damaged) g.fillStyle(0xffffff, 1);
        else if (b.shielded) g.fillStyle(0x98CAFF, 1);
        else g.fillStyle(0xff9500, 1);
        g.fillCircle(b.x, b.y, b.radius);

        const w = b.radius * 2;
        const h = 5;
        const pct = b.health / b.maxHealth;
        g.fillStyle(0x646464, 0.5);
        g.fillRect(b.x - b.radius, b.y + b.radius + 10, w, h);
        g.fillStyle(0xff3030, 1);
        g.fillRect(b.x - b.radius, b.y + b.radius + 10, w * pct, h);

        if (b.shields > 0) {
            g.fillStyle(0x00FF40, 1);
            g.fillCircle(b.x, b.y - 25, 12);
            g.lineStyle(2, 0xffffff, 1);
            g.strokeCircle(b.x, b.y - 25, 12);
            if (b.shields > 1) {
                const text = this.add.text(b.x, b.y - 25, b.shields, { font: '14px Arial', color: '#ffffff' });
                text.setOrigin(0.5);
                this.time.delayedCall(100, () => text.destroy());
            }
        }

        if (b.swingStarted) {
            const bx = b.x - b.radius;
            const by = b.y + b.radius + 20;
            g.fillStyle(0x646464, 0.5);
            g.fillRect(bx, by, w, h);
            g.fillStyle(0xffffff, 1);
            g.fillRect(bx, by, w * (b.swingProgress / 100), h);
        }
    }

    startSwingTimer(b) {
        b.swingStarted = true;
        b.swingProgress = 0;
        b.swingEvent = this.time.addEvent({
            delay: 50,
            repeat: 100,
            callback: () => {
                b.swingProgress++;
                if (b.swingProgress >= 100) {
                    b.swingEvent.remove();
                    this.shootProjectile(b.x, b.y);
                }
            }
        });
    }

    shootProjectile(x, y) {
        const graphics = this.add.graphics();
        this.projectiles.push({ x, y, speed: 5, graphics });
    }

    handlePointerDown(pointer) {
        this.pointerStart = { x: pointer.x, y: pointer.y, time: this.time.now };
        this.barrierActive = true;
    }

    handlePointerUp(pointer) {
        const d = this.time.now - this.pointerStart.time;
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.pointerStart.x, this.pointerStart.y);
        if (d < 200 && dist < 10) this.removeShield();
        else this.createSwipeLine(this.pointerStart.x, this.pointerStart.y, pointer.x, pointer.y);
        this.barrierActive = false;
    }

    removeShield() {
        const b = this.ball;
        if (!b || !b.shielded || b.shields === 0) return;
        b.shields--;
        if (b.shields === 0) b.shielded = false;
    }

    createSwipeLine(x1, y1, x2, y2) {
        const b = this.ball;
        if (!b || b.shielded) return;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const halfLen = length / 2;
        const hx = Math.cos(angle) * halfLen;
        const hy = Math.sin(angle) * halfLen;
        const startX = b.x - hx;
        const startY = b.y - hy;
        const endX = b.x + hx;
        const endY = b.y + hy;
        const line = this.add.graphics();
        line.lineStyle(configScene.swipeLineWidth, 0xffffff, 1);
        line.beginPath();
        line.moveTo(startX, startY);
        line.lineTo(endX, endY);
        line.strokePath();
        this.time.delayedCall(configScene.swipeLineDuration, () => line.destroy());
        this.damageBall();
    }

    damageBall() {
        const b = this.ball;
        b.health -= configScene.swipeDamage;
        b.damaged = true;
        b.damageTimer = configScene.hitEffectDuration;
        if (b.health <= 0) {
            b.graphics.destroy();
            this.ball = null;
            this.combo++;
            this.lastComboTime = this.time.now;
        }
    }

    handleMiss() {
        const b = this.ball;
        if (b) b.graphics.destroy();
        this.ball = null;
        this.combo = 0;
    }
}

const phaserConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#000000',
    scene: MainScene
};

window.addEventListener('load', () => {
    new Phaser.Game(phaserConfig);
});
