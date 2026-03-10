import * as THREE from "three";

const ROLE_STATS = {
  patrol: { hp: 70, accuracy: 0.58, reaction: 0.45, color: 0xc24e4e },
  sentry: { hp: 75, accuracy: 0.65, reaction: 0.38, color: 0xb53c3c },
  overwatch: { hp: 80, accuracy: 0.72, reaction: 0.32, color: 0x9b3737 },
  interior: { hp: 78, accuracy: 0.62, reaction: 0.35, color: 0xaa4444 },
  bunker: { hp: 82, accuracy: 0.67, reaction: 0.3, color: 0x8c2e2e },
  reinforcement: { hp: 76, accuracy: 0.6, reaction: 0.32, color: 0xd16565 }
};

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export class EnemyAI {
  constructor(scene, spawn, role, mapData) {
    this.role = role;
    this.stats = ROLE_STATS[role] || ROLE_STATS.patrol;
    this.position = spawn.position.clone();
    this.currentLevel = spawn.level;
    this.spawn = spawn;
    this.mapData = mapData;

    this.hp = this.stats.hp;
    this.dead = false;

    this.state = spawn.patrol?.length ? "patrol" : "guard";
    this.stateTimer = randRange(0.5, 1.8);
    this.fireCooldown = randRange(0.15, 0.5);
    this.reactionTimer = this.stats.reaction;
    this.searchTimer = 0;
    this.damageTimer = 0;
    this.tookRecentDamage = false;
    this.lastKnownPlayerPos = null;
    this.lastSeenTime = -999;
    this.inCoverCooldown = 0;

    this.speed = role === "reinforcement" ? 4.7 : 4.0;
    this.alertRadius = 24;
    this.maxSightDistance = role === "overwatch" ? 70 : 42;

    this.pathIndex = 0;
    this.patrol = spawn.patrol || [];
    this.guardPoint = spawn.position.clone();

    this.mesh = this.createMesh();
    this.mesh.position.copy(this.position);
    this.mesh.userData.enemy = this;
    scene.add(this.mesh);
  }

  createMesh() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.33, 0.85, 3, 8),
      new THREE.MeshStandardMaterial({
        color: this.stats.color,
        roughness: 0.78,
        metalness: 0.08
      })
    );
    body.castShadow = true;
    group.add(body);

    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0x20272f,
        roughness: 0.65
      })
    );
    helmet.position.y = 0.92;
    helmet.castShadow = true;
    group.add(helmet);

    group.position.y = this.position.y + 0.9;
    return group;
  }

  getHeadWorldPos() {
    return new THREE.Vector3(this.position.x, this.position.y + 1.58, this.position.z);
  }

  update(dt, game) {
    if (this.dead) return;

    this.fireCooldown -= dt;
    this.stateTimer -= dt;

    if (this.damageTimer > 0) {
      this.damageTimer -= dt;
    } else {
      this.tookRecentDamage = false;
    }

    if (this.inCoverCooldown > 0) {
      this.inCoverCooldown -= dt;
    }

    const player = game.player;
    const playerDist = this.position.distanceTo(player.position);
    const sameLevel = player.currentLevel === this.currentLevel;

    const canSeePlayer =
      sameLevel &&
      playerDist <= this.maxSightDistance &&
      game.hasLineOfSight(this.getHeadWorldPos(), game.getPlayerAimPoint());

    if (canSeePlayer) {
      this.lastKnownPlayerPos = player.position.clone();
      this.lastSeenTime = performance.now() * 0.001;

      if (this.state !== "attack" && this.state !== "defuse") {
        this.state = "attack";
        this.reactionTimer = this.stats.reaction + randRange(0, 0.18);
      }
    }

    if (game.objective.bombPlanted && !this.dead) {
      const distToBomb = this.position.distanceTo(game.objective.bombSite.position);

      if (
        distToBomb < 2 &&
        this.currentLevel === game.objective.bombSite.level &&
        !game.objective.defusingEnemy &&
        !canSeePlayer &&
        player.position.distanceTo(game.objective.bombSite.position) > 6
      ) {
        this.state = "defuse";
      } else if (this.state !== "attack" && this.state !== "defuse") {
        this.state = "defendBomb";
      }
    }

    switch (this.state) {
      case "patrol":
        this.updatePatrol(dt, game);
        break;
      case "guard":
        this.updateGuard(dt, game);
        break;
      case "search":
        this.updateSearch(dt, game);
        break;
      case "attack":
        this.updateAttack(dt, game, canSeePlayer, playerDist);
        break;
      case "defendBomb":
        this.updateDefendBomb(dt, game);
        break;
      case "defuse":
        this.updateDefuse(dt, game, canSeePlayer);
        break;
      default:
        this.updateGuard(dt, game);
        break;
    }

    this.mesh.position.set(this.position.x, this.position.y + 0.9, this.position.z);
  }

  updatePatrol(dt, game) {
    if (!this.patrol.length) {
      this.state = "guard";
      return;
    }

    const target = this.patrol[this.pathIndex];
    this.moveToward(target, dt, game);

    if (this.position.distanceTo(target) < 0.9) {
      this.pathIndex = (this.pathIndex + 1) % this.patrol.length;
      this.stateTimer = randRange(0.4, 1.2);

      if (Math.random() < 0.2) {
        this.state = "guard";
      }
    }
  }

  updateGuard(dt, game) {
    if (this.stateTimer <= 0) {
      if (this.patrol.length && Math.random() < 0.65) {
        this.state = "patrol";
      } else if (this.lastKnownPlayerPos) {
        this.state = "search";
        this.searchTimer = 4.5 + Math.random() * 2;
      } else {
        this.stateTimer = 1 + Math.random() * 1.5;
      }
    }

    if (this.position.distanceTo(this.guardPoint) > 1.5) {
      this.moveToward(this.guardPoint, dt, game);
    }
  }

  updateSearch(dt, game) {
    if (!this.lastKnownPlayerPos) {
      this.state = this.patrol.length ? "patrol" : "guard";
      return;
    }

    this.searchTimer -= dt;
    this.moveToward(this.lastKnownPlayerPos, dt, game, 1.08);

    if (this.position.distanceTo(this.lastKnownPlayerPos) < 1.5) {
      this.lastKnownPlayerPos = this.findNearbyCoverOrAngle();
    }

    if (this.searchTimer <= 0) {
      this.state = this.patrol.length ? "patrol" : "guard";
    }
  }

  updateAttack(dt, game, canSeePlayer, playerDist) {
    if (canSeePlayer) {
      if (this.reactionTimer > 0) {
        this.reactionTimer -= dt;
      } else {
        this.tryShoot(game, playerDist);
      }

      if (playerDist > 12 || (Math.random() < 0.006 && this.inCoverCooldown <= 0)) {
        const coverPos = this.findNearbyCoverOrAngle();
        this.moveToward(coverPos, dt, game, 1.05);
        this.inCoverCooldown = 2 + Math.random() * 2;
      }
    } else {
      const lostFor = performance.now() * 0.001 - this.lastSeenTime;

      if (this.lastKnownPlayerPos && lostFor < 4) {
        this.state = "search";
        this.searchTimer = 4;
      } else {
        this.state = game.objective.bombPlanted
          ? "defendBomb"
          : (this.patrol.length ? "patrol" : "guard");
      }
    }
  }

  updateDefendBomb(dt, game) {
    const target = game.objective.bombSite.position;

    if (this.currentLevel !== game.objective.bombSite.level) {
      this.navigateToLevel(target, game, dt);
      return;
    }

    const orbitOffset = new THREE.Vector3(
      Math.sin(this.mesh.id * 1.73) * 3.4,
      0,
      Math.cos(this.mesh.id * 1.73) * 3.4
    );

    this.moveToward(target.clone().add(orbitOffset), dt, game, 1.1);
  }

  updateDefuse(dt, game, canSeePlayer) {
    const target = game.objective.bombSite.position;

    if (this.currentLevel !== game.objective.bombSite.level) {
      this.navigateToLevel(target, game, dt);
      return;
    }

    if (canSeePlayer) {
      this.state = "attack";
      return;
    }

    if (this.position.distanceTo(target) > 1.35) {
      this.moveToward(target, dt, game);
    } else {
      game.objective.startDefuse(this);

      if (Math.random() < 0.1) {
        game.audio.playDefuse();
      }
    }
  }

  tryShoot(game, distance) {
    if (this.fireCooldown > 0) return;

    const player = game.player;
    const aimError =
      (1 - this.stats.accuracy) * Math.min(1.2, distance / 32) +
      (player.input.crouch ? -0.05 : 0.02);

    let hitChance = this.stats.accuracy - aimError;
    hitChance = Math.max(0.18, Math.min(0.92, hitChance));

    if (Math.random() < hitChance) {
      const baseDamage = this.role === "overwatch" ? 15 : 12;
      game.damagePlayer(baseDamage + Math.random() * 4);
    }

    this.fireCooldown = 0.16 + Math.random() * 0.22;
  }

  moveToward(target, dt, game, speedScale = 1) {
    if (!target) return;

    if (target.level !== undefined && target.level !== this.currentLevel) {
      this.navigateToLevel(target.position || target, game, dt);
      return;
    }

    const targetPos = target.position ? target.position : target;
    const dir = new THREE.Vector3().subVectors(targetPos, this.position);
    dir.y = 0;

    const dist = dir.length();
    if (dist < 0.05) return;

    dir.normalize();

    const step = Math.min(dist, this.speed * speedScale * dt);
    const next = this.position.clone().add(dir.multiplyScalar(step));

    if (!game.testEnemyCollision(next, this)) {
      this.position.copy(next);
    } else {
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(step);
      const attemptA = this.position.clone().add(side);
      const attemptB = this.position.clone().sub(side);

      if (!game.testEnemyCollision(attemptA, this)) {
        this.position.copy(attemptA);
      } else if (!game.testEnemyCollision(attemptB, this)) {
        this.position.copy(attemptB);
      }
    }
  }

  navigateToLevel(finalTarget, game, dt) {
    const targetLevel = game.getTargetLevelForPosition(finalTarget);
    const link = game.findBestTransferLink(this.currentLevel, targetLevel);

    if (!link) return;

    const approachTarget = link.fromPos;
    const dist = this.position.distanceTo(approachTarget);

    if (dist > 0.9) {
      this.moveToward(approachTarget, dt, game);
    } else {
      this.position.copy(link.toPos.clone());
      this.currentLevel = link.toLevel;
    }
  }

  findNearbyCoverOrAngle() {
    const offset = new THREE.Vector3(
      randRange(-3.5, 3.5),
      0,
      randRange(-3.5, 3.5)
    );

    return this.position.clone().add(offset);
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.tookRecentDamage = true;
    this.damageTimer = 0.9;
    this.state = "attack";

    if (this.hp <= 0) {
      this.dead = true;
      this.mesh.visible = false;
    }
  }
}
