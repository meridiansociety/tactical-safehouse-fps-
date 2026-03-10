import * as THREE from "three";

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class ObjectiveManager {
  constructor(bombSite) {
    this.bombSite = bombSite;

    this.phase = "infiltration";
    this.missionTime = 15 * 60;
    this.plantDuration = 5.2;
    this.bombDuration = 65;
    this.defuseDuration = 6.5;

    this.plantProgress = 0;
    this.isPlanting = false;

    this.bombPlanted = false;
    this.bombTimer = 0;

    this.defuseProgress = 0;
    this.defusingEnemy = null;

    this.reinforcementsCalled = false;
    this.result = null;
  }

  update(dt, game) {
    if (this.result) return;

    this.missionTime -= dt;
    if (this.missionTime <= 0) {
      this.missionTime = 0;
      this.result = { type: "defeat", reason: "Mission timer expired." };
      return;
    }

    if (game.player.dead) {
      this.result = { type: "defeat", reason: "You were killed in action." };
      return;
    }

    const player = game.player;
    const distanceToSite = horizontalDistance(player.position, this.bombSite.position);
    const onCorrectLevel = player.currentLevel === this.bombSite.level;

    if (!this.bombPlanted) {
      if (distanceToSite < this.bombSite.radius && onCorrectLevel) {
        const movementTooHigh = player.isActuallyMoving();

        if (game.input.interactHeld && !movementTooHigh) {
          this.isPlanting = true;
          this.phase = "planting";
          this.plantProgress += dt / this.plantDuration;

          if (this.plantProgress >= 1) {
            this.plantProgress = 1;
            this.startBomb(game);
          }
        } else {
          this.cancelPlant(dt);
        }
      } else {
        this.cancelPlant(dt);
      }
    } else {
      this.bombTimer -= dt;

      if (this.bombTimer <= 0) {
        this.bombTimer = 0;
        this.result = game.player.dead
          ? { type: "defeat", reason: "Charge detonated, but you did not survive." }
          : { type: "victory", reason: "Charge detonated. Objective complete." };
        return;
      }

      if (this.defusingEnemy) {
        const enemy = this.defusingEnemy;
        const enemyNearBomb =
          !enemy.dead &&
          enemy.currentLevel === this.bombSite.level &&
          horizontalDistance(enemy.position, this.bombSite.position) <= 2.25;

        if (!enemyNearBomb || enemy.tookRecentDamage) {
          this.interruptDefuse();
        } else {
          this.defuseProgress += dt / this.defuseDuration;
          if (this.defuseProgress >= 1) {
            this.defuseProgress = 1;
            this.bombPlanted = false;
            this.result = { type: "defeat", reason: "The bomb was defused." };
          }
        }
      }
    }
  }

  cancelPlant(dt = 0) {
    this.isPlanting = false;
    this.phase = this.bombPlanted ? "postPlant" : "interiorAssault";
    this.plantProgress = Math.max(0, this.plantProgress - dt * 1.8);
  }

  startBomb(game) {
    this.bombPlanted = true;
    this.phase = "postPlant";
    this.isPlanting = false;
    this.bombTimer = this.bombDuration;
    this.plantProgress = 0;
    game.audio.playBombPlant();
  }

  startDefuse(enemy) {
    if (!this.bombPlanted) return false;
    if (this.defusingEnemy && this.defusingEnemy !== enemy) return false;

    this.defusingEnemy = enemy;
    return true;
  }

  interruptDefuse() {
    this.defusingEnemy = null;
    this.defuseProgress = 0;
  }

  shouldShowPlantPrompt(game) {
    if (this.bombPlanted) return false;
    return (
      game.player.currentLevel === this.bombSite.level &&
      horizontalDistance(game.player.position, this.bombSite.position) < this.bombSite.radius
    );
  }

  getObjectiveText() {
    if (this.result) return this.result.reason;
    if (!this.bombPlanted) return "Reach the intelligence room and plant the charge.";
    if (this.defusingEnemy) return "Protect the bomb. Enemy defuse in progress.";
    return "Hold the site. Survive until detonation.";
  }

  formatMissionTime() {
    return formatTime(this.missionTime);
  }

  formatBombTime() {
    return formatTime(this.bombTimer);
  }
}
