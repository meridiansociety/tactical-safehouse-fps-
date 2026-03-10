export class UIManager {
  constructor() {
    this.refs = {
      objectiveText: document.getElementById("objective-text"),
      missionTimer: document.getElementById("mission-timer"),
      enemyCount: document.getElementById("enemy-count"),
      healthValue: document.getElementById("health-value"),
      armorValue: document.getElementById("armor-value"),
      weaponName: document.getElementById("weapon-name"),
      ammoValue: document.getElementById("ammo-value"),
      bombStatus: document.getElementById("bomb-status"),
      bombTimer: document.getElementById("bomb-timer"),
      interactPrompt: document.getElementById("interact-prompt"),
      progressWrapper: document.getElementById("progress-wrapper"),
      progressLabel: document.getElementById("progress-label"),
      progressFill: document.getElementById("progress-fill"),
      defuseAlert: document.getElementById("defuse-alert"),
      damageVignette: document.getElementById("damage-vignette"),
      flashOverlay: document.getElementById("flash-overlay"),
      hitmarker: document.getElementById("hitmarker"),
      menuOverlay: document.getElementById("menu-overlay"),
      pauseOverlay: document.getElementById("pause-overlay"),
      endOverlay: document.getElementById("end-overlay"),
      endTitle: document.getElementById("end-title"),
      endMessage: document.getElementById("end-message")
    };

    this.hitmarkerTimer = 0;
    this.flashTimer = 0;
    this.damageAlpha = 0;
  }

  update(dt, game) {
    const { player, objective, enemies } = game;
    const gun = player.weaponSystem.active;

    this.refs.objectiveText.textContent = objective.getObjectiveText();
    this.refs.missionTimer.textContent = objective.formatMissionTime();
    this.refs.enemyCount.textContent = enemies.filter(e => !e.dead).length;
    this.refs.healthValue.textContent = Math.round(player.health);
    this.refs.armorValue.textContent = Math.round(player.armor);
    this.refs.weaponName.textContent = gun.name;
    this.refs.ammoValue.textContent = `${gun.ammoInMag} / ${gun.reserveAmmo}`;

    if (!objective.bombPlanted) {
      this.refs.bombStatus.textContent = "Charge not planted";
      this.refs.bombTimer.classList.add("hidden");
    } else {
      this.refs.bombStatus.textContent = "Charge planted";
      this.refs.bombTimer.classList.remove("hidden");
      this.refs.bombTimer.textContent = objective.formatBombTime();
    }

    const prompt = game.getContextPrompt();
    if (prompt) {
      this.refs.interactPrompt.classList.remove("hidden");
      this.refs.interactPrompt.textContent = prompt;
    } else {
      this.refs.interactPrompt.classList.add("hidden");
    }

    if (objective.isPlanting) {
      this.refs.progressWrapper.classList.remove("hidden");
      this.refs.progressLabel.textContent = "PLANTING";
      this.refs.progressFill.style.width = `${objective.plantProgress * 100}%`;
    } else if (objective.defusingEnemy) {
      this.refs.progressWrapper.classList.remove("hidden");
      this.refs.progressLabel.textContent = "DEFUSE ALERT";
      this.refs.progressFill.style.width = `${objective.defuseProgress * 100}%`;
    } else {
      this.refs.progressWrapper.classList.add("hidden");
      this.refs.progressFill.style.width = "0%";
    }

    if (objective.defusingEnemy) this.refs.defuseAlert.classList.remove("hidden");
    else this.refs.defuseAlert.classList.add("hidden");

    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      this.refs.hitmarker.classList.add("active");
    } else {
      this.refs.hitmarker.classList.remove("active");
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.refs.flashOverlay.style.opacity = String(Math.max(0, this.flashTimer * 4));
    } else {
      this.refs.flashOverlay.style.opacity = "0";
    }

    this.damageAlpha = Math.max(0, this.damageAlpha - dt * 1.8);
    this.refs.damageVignette.style.opacity = String(this.damageAlpha);
  }

  showHitmarker() {
    this.hitmarkerTimer = 0.08;
  }

  flash() {
    this.flashTimer = 0.12;
  }

  damage(amount) {
    this.damageAlpha = Math.min(0.8, this.damageAlpha + amount * 0.012);
  }

  showPause(show) {
    this.refs.pauseOverlay.classList.toggle("hidden", !show);
    this.refs.pauseOverlay.classList.toggle("visible", show);
  }

  showEnd(type, message) {
    this.refs.endOverlay.classList.remove("hidden");
    this.refs.endOverlay.classList.add("visible");
    this.refs.endTitle.textContent = type === "victory" ? "Mission Complete" : "Mission Failed";
    this.refs.endMessage.textContent = message;
  }

  hideEnd() {
    this.refs.endOverlay.classList.add("hidden");
    this.refs.endOverlay.classList.remove("visible");
  }
}
