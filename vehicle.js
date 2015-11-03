
function Player(x, y, color, name) {
	this.ANGLE_LOWER_LIMIT = CONST.ANGLE_LOWER_LIMIT;
	this.ANGLE_UPPER_LIMIT = CONST.ANGLE_UPPER_LIMIT;
	this.PLAYER_WIDTH = CONST.PLAYER_WIDTH;
	this.PLAYER_HEIGHT = CONST.PLAYER_HEIGHT;
	this.BARREL_WIDTH = CONST.BARREL_WIDTH;
	this.BARREL_HEIGHT = CONST.BARREL_HEIGHT;
	this.BARREL_COLOR = CONST.BARREL_COLOR;
	this.MAX_BULLET_THRUST = CONST.MAX_BULLET_THRUST;
	this.MAX_HEALTH_POINT = 1000;

	this.name = name;
	this.x = x
	this.y = y
	this.v = 0;
	this.color = color;
	this.thrust = 0;
	this.dir = [1, 0];
	this.hp = this.MAX_HEALTH_POINT;
	this.angle = 45;
	this.orientation = 1;
	this.command = {};
	this.power = 0;
	this.isAlive = true;

	this.damagedDelta = 0;

	this.bufferCaption();
}

Player.prototype.bufferCaption = function() {
	this.bufferedCaption = createText(this.name, 21, "white");
}

Player.prototype.render = function(g) {
	var theta = Math.atan2(this.dir[1], this.dir[0]);

	g.save();
	g.translate(this.x, this.y);

	g.save();
	g.rotate(theta);
	this.renderBody(g);
	this.renderBarrel(g);
	g.restore();

	this.renderNameCaption(g);
	this.renderHealthBar(g);
	g.restore();
}

Player.prototype.renderBody = function(g) {
	if (!this.isAlive) {
		this.PLAYER_HEIGHT = 30;
		this.color = "#633";
		this.BARREL_COLOR = "#633";
	}
	g.fillStyle = this.color;
	if (this.damagedDelta > 0) {
		this.damagedDelta--;
		g.fillStyle = "red";
		g.strokeStyle = "red";
	}
	g.lineWidth = 3;
	g.fillRect(-this.PLAYER_WIDTH/2, -this.PLAYER_HEIGHT/2, this.PLAYER_WIDTH, this.PLAYER_HEIGHT);
	g.strokeRect(-this.PLAYER_WIDTH/2, -this.PLAYER_HEIGHT/2, this.PLAYER_WIDTH, this.PLAYER_HEIGHT);
}

Player.prototype.renderBarrel = function(g) {
	g.save();
	g.scale(this.orientation, 1);
	g.rotate(-this.angle * Math.PI/180);
	g.fillStyle = this.BARREL_COLOR;
	g.lineWidth = 2;
	g.fillRect(0, -this.BARREL_HEIGHT/2, this.BARREL_WIDTH, this.BARREL_HEIGHT);
	g.strokeRect(0, -this.BARREL_HEIGHT/2, this.BARREL_WIDTH, this.BARREL_HEIGHT);
	g.restore();
}

Player.prototype.renderNameCaption = function(g) {
	var w = this.bufferedCaption.width;
	var h = this.bufferedCaption.height;
	g.fillStyle = "rgba(0,0,0, 0.6)";
	g.fillRect(-(w+10)/2, 20, w+10, h);
	g.drawImage(this.bufferedCaption, 0, 0, w, h, -w/2, 20, w, h);
}

Player.prototype.renderHealthBar = function(g) {
	var w = CONST.HEALTH_BAR_LENGTH;
	var h = 6;
	var offset = -48;
	g.fillStyle = "red";
	g.fillRect(-w/2, offset, w, h);
	g.fillStyle = "green";
	g.fillRect(-w/2, offset, w * this.hp / this.MAX_HEALTH_POINT, h);
}

Player.prototype.commandHandler = function(state) {
	if (this.command["ADJUST_ANGLE_UP"]) {
		this.angle += CONST.ANGLE_DELTA;
		if (this.angle > this.ANGLE_UPPER_LIMIT) this.angle = this.ANGLE_UPPER_LIMIT;
	}
	if (this.command["ADJUST_ANGLE_DOWN"]) {
		this.angle -= CONST.ANGLE_DELTA;
		if (this.angle < this.ANGLE_LOWER_LIMIT) this.angle = this.ANGLE_LOWER_LIMIT;
	}
	if (this.command["CHARGE_POWER"]) {
		this.command["CHARGING_POWER"] = true;
		this.command["CHARGE_POWER"] = false;
		this.power = 0;
	}
	if (this.command["CHARGING_POWER"]) {
		this.power += CONST.POWER_DELTA;
		if (this == state.player[CONST.MAIN_PLAYER]) {
			state.powerBar.power = this.power;
		}
	}
	if (this.command["SHOOT"]) {
		state.bullets.push(this.createBullet());
		this.command["SHOOT"] = false;
		state.viewMode["LOCKED_BULLET_VIEW_MODE"] = true;
		state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = false;
	}
}

Player.prototype.createBullet = function() {
	var d = [this.orientation * this.dir[0], this.orientation * this.dir[1]];
	rotate(d, this.orientation * this.angle * Math.PI/180);
	var x = this.x + d[0] * (this.BARREL_WIDTH + 20);
	var y = this.y + d[1] * (this.BARREL_WIDTH + 20);
	var r = this.power / CONST.MAX_POWER * this.MAX_BULLET_THRUST;
	var v = [r * d[0], r * d[1]];

	return this.bulletFactory(x, y, v);
}

Player.prototype.bulletFactory = function(x, y, v) {
	return new Bullet(x, y, v);
}

Player.prototype.movementUpdate = function() {
	var temp = {
		x : this.x,
		y : this.y,
		dir : [this.dir[0], this.dir[1]],
		v : this.v,
	};
	temp.v += CONST.GRAVITY;
	temp.y += temp.v;
	var pivots = computePivots(temp);
	if (checkCollision(pivots[0]) || checkCollision(pivots[1])) {
		temp = resolveTerrainCollision(this, temp);
	}

	setPlayerState(this, temp);

	pivots = computePivots(temp);
	if (checkCollision(pivots[0])||checkCollision(pivots[1])) return;
	temp.x += this.thrust;
	pivots = computePivots(temp);
	if (checkCollision(pivots[0]) || checkCollision(pivots[1])) {
		temp = resolveTerrainCollision(this, temp);
	}

	setPlayerState(this, temp);
}

Player.prototype.receiveDamage = function(damage) {
	if (!this.isAlive) {
		return;
	}
	this.hp -= damage;
	this.damagedDelta = 20;
	if (this.hp <= 0) {
		this.hp = 0;
		this.isAlive = false;
	}
	createDamageEffect(this.x, this.y-20, damage);
}

function Bullet(x, y, v) {
	this.x = x;
	this.y = y;
	this.v = v;
	this.isAlive = true;
	this.EXPLOSION_RADIUS = CONST.EXPLOSION_RADIUS;
	this.GRAVITY = CONST.GRAVITY;
	this.WIND_STRENGTH_CALLIBRATOR = CONST.WIND_STRENGTH_CALLIBRATOR;
	this.BULLET_RADIUS = CONST.BULLET_RADIUS;
	this.EXPLOSION_DAMAGE = 500;
}

Bullet.prototype.update = function(state) {
	if (this.x < 0 || this.x > CONST.WORLD_WIDTH || this.y > CONST.WORLD_HEIGHT) {
		this.isAlive = false;
	}
	this.x += this.v[0];
	this.y += this.v[1];

	if (checkBulletCollision(this)) {
		state.explosions.push(createExplosion(this.x, this.y+16, this.EXPLOSION_RADIUS, this.EXPLOSION_DAMAGE));
		this.isAlive = false;
	}

	var wind = computeWindForce();
	this.v[0] += wind[0] * this.WIND_STRENGTH_CALLIBRATOR;
	this.v[1] += wind[1] * this.WIND_STRENGTH_CALLIBRATOR + this.GRAVITY;
}

Bullet.prototype.render = function(g) {
	var theta = Math.atan2(this.v[1], this.v[0]);
	g.save();
	g.translate(this.x, this.y);
	g.rotate(theta);
	this.renderBody(g);
	g.restore();
}

Bullet.prototype.renderBody = function(g) {
	g.fillStyle = "#f01";
	g.lineWidth = 3;
	g.fillRect(-this.BULLET_RADIUS - 10,-this.BULLET_RADIUS, this.BULLET_RADIUS+20, this.BULLET_RADIUS*2);
	g.fillStyle = "white"
	g.fillRect(-this.BULLET_RADIUS ,-this.BULLET_RADIUS, 10, this.BULLET_RADIUS*2);
	g.strokeRect(-this.BULLET_RADIUS - 10,-this.BULLET_RADIUS, this.BULLET_RADIUS+20, this.BULLET_RADIUS*2);
}





function Balroc(x, y, color, name) {
	Player.call(this, x, y, color, name);
}

Balroc.prototype = Object.create(Player.prototype);

function HeavyArmor(x, y, v) {
	Bullet.call(this, x, y, v);
	this.GRAVITY = CONST.GRAVITY + 0.01;
	this.BULLET_RADIUS = CONST.BULLET_RADIUS + 3;
}

HeavyArmor.prototype = Object.create(Bullet.prototype);

Balroc.prototype.bulletFactory = function(x, y, v){
	return new HeavyArmor(x, y, v); 
}
