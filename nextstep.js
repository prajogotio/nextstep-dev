addEventListener("DOMContentLoaded", function() {
	initialize();
	startGame();
});

var state = {
	player : [],
	viewMode : {},
	viewOffset : [0, -800],
	terrainOffset : [100, 1000],
	powerBar : {
		power : 0,
	},
	bullets : [],
	explosions : [],
	wind : {
		angle : -90,
		strength : 0,
		bufferCaption : createText("0", 40),
	},
};

var CONST = {
	MAIN_PLAYER : 0,
	TIME_DELTA : 1000/60,
	PLAYER_WIDTH : 64,
	PLAYER_HEIGHT : 64,
	PLAYER_SPEED : 1,
	PLAYER_MASS : 3,
	ANGLE_DELTA : 1,
	ANGLE_LOWER_LIMIT : 20,
	ANGLE_UPPER_LIMIT : 55,
	GRAVITY : 0.28,
	OPAQUE_VALUE : 80,
	WORLD_WIDTH : 3000,
	WORLD_HEIGHT : 3000,
	BARREL_WIDTH : 50,
	BARREL_HEIGHT: 16,
	BARREL_COLOR : "#fff",
	CONTROL_BAR_COLOR : "rgba(0,0,0,0.6)",
	CONTROL_BAR_HEIGHT : 80,
	MAX_POWER : 800,
	POWER_BAR_HEIGHT : 40,
	POWER_BAR_COLOR : "#000",
	POWER_BAR_RATIO : 0.8,
	POWER_DELTA : 10,
	POWER_BAR_ACTIVE_COLOR : "#f00",
	BULLET_RADIUS : 10,
	MAX_BULLET_THRUST : 50,
	MAX_WIND_STRENGTH : 10,
	EXPLOSION_RADIUS : 60,
	WIND_STRENGTH_CALLIBRATOR : 0.02,
};

function initialize() {
	state.display = document.getElementById("display");
	state.g = display.getContext("2d");
	initializeAsset();
}


function createPlayer(x, y, color) {
	var player = {};
	player.x = x
	player.y = y
	player.v = 0;
	player.color = color;
	player.thrust = 0;
	player.dir = [1, 0];
	player.hp = 1000;
	player.angle = 45;
	player.orientation = 1;
	player.command = {};
	player.power = 0;
	player.isAlive = true;
	return player;
}

function startGame() {
	var startHeight = 800;
	state.player.push(createPlayer(state.display.width/2, startHeight, "#fab"));
	state.player.push(createPlayer(state.display.width/2 + 300, startHeight, "#8af"));
	state.player.push(createPlayer(state.display.width/2 + 800, startHeight, "#8e7"));
	state.player.push(createPlayer(state.display.width/2 - 400, startHeight, "#99a"));
	var timer = setInterval(function(){
		update();
		render();
	}, CONST.TIME_DELTA);
	addEventListener("mousedown", function(e) {
		state.viewMode["SHIFT_VIEW_MODE"] = true;
		state.shiftOrigin = [e.pageX - state.display.offsetLeft, e.pageY - state.display.offsetTop];
		state.mouseOffset = [e.pageX - state.display.offsetLeft, e.pageY - state.display.offsetTop]
		state.prevViewOffset = [state.viewOffset[0], state.viewOffset[1]];
	});
	addEventListener("mouseup", function(e) {
		state.viewMode["SHIFT_VIEW_MODE"] = false;
	})
	addEventListener("mousemove", function(e) {
		state.mouseOffset = [e.pageX - state.display.offsetLeft, e.pageY - state.display.offsetTop];
	});
	addEventListener("keydown", function(e) {
		if(e.which == 37) {
			state.player[CONST.MAIN_PLAYER].thrust = -CONST.PLAYER_SPEED;
			state.player[CONST.MAIN_PLAYER].orientation = -1;
			state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = true;
		} else if (e.which == 39) {
			state.player[CONST.MAIN_PLAYER].thrust = CONST.PLAYER_SPEED;
			state.player[CONST.MAIN_PLAYER].orientation = 1;
			state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = true;
		} else if (e.which == 38) {
			state.player[CONST.MAIN_PLAYER].command["ADJUST_ANGLE_UP"] = true;
		} else if (e.which == 40) {
			state.player[CONST.MAIN_PLAYER].command["ADJUST_ANGLE_DOWN"] = true;
		} else if (e.which == 32) {
			if(!state.player[CONST.MAIN_PLAYER].command["CHARGING_POWER"]) {
				state.player[CONST.MAIN_PLAYER].command["CHARGE_POWER"] = true;
			}
		}
	});
	addEventListener("keyup", function(e) {
		state.player[CONST.MAIN_PLAYER].thrust = 0;
		state.player[CONST.MAIN_PLAYER].command = {};
		if (e.which == 32) {
			state.player[CONST.MAIN_PLAYER].command["SHOOT"] = true;
		}
	});
}

function update() {
	for (var i = 0; i < state.explosions.length; ++i) {
		updateExplosion(state.explosions[i]);
	}
	state.explosions = [];

	IOEventsHandler();
	for(var i = 0; i < state.player.length;++i) {
		playerCommandHandler(state.player[i]);
		movementUpdate(state.player[i]);
	}

	var tmp = [];
	for (var i = 0; i < state.bullets.length; ++i) {
		bulletUpdate(state.bullets[i]);
		if (state.bullets[i].isAlive) tmp.push(state.bullets[i]);
	}
	state.bullets = tmp;
}

function IOEventsHandler() {
	if (state.viewMode["SHIFT_VIEW_MODE"]) {
		state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = false;
		var dx = state.mouseOffset[0] - state.shiftOrigin[0];
		var dy = state.mouseOffset[1] - state.shiftOrigin[1];
		state.viewOffset = [state.prevViewOffset[0] + dx, state.prevViewOffset[1] + dy];
	}
	else if (state.viewMode["LOCKED_BULLET_VIEW_MODE"]) {
		if (state.bullets.length == 0) {
			state.viewMode["LOCKED_BULLET_VIEW_MODE"] = false;
		} else {
			state.viewOffset[0] = -state.bullets[0].x + state.display.width/2;
			state.viewOffset[1] = -state.bullets[0].y + state.display.height/2;
		}
	}
	else if (state.viewMode["LOCKED_PLAYER_VIEW_MODE"]) {
		state.viewOffset[0] = -state.player[CONST.MAIN_PLAYER].x + state.display.width/2;
		state.viewOffset[1] = -state.player[CONST.MAIN_PLAYER].y + state.display.height/2;
	}
}

function updateExplosion(explosion) {
	var g = state.terrainBuffer.getContext("2d");
	g.save();
	g.globalCompositeOperation = 'destination-out';
	g.beginPath();
	g.arc(explosion.x - state.terrainOffset[0], explosion.y - state.terrainOffset[1], explosion.radius, 0, 2*Math.PI);
	g.fill();
	g.globalCompositeOperation = 'source-atop';
	g.lineWidth = 10;
	g.stroke();
	g.restore();
	state.terrainData = g.getImageData(0, 0, state.terrainBuffer.width, state.terrainBuffer.height);
}

function playerCommandHandler(player) {
	if (player.command["ADJUST_ANGLE_UP"]) {
		player.angle += CONST.ANGLE_DELTA;
		if (player.angle > CONST.ANGLE_UPPER_LIMIT) player.angle = CONST.ANGLE_UPPER_LIMIT;
	}
	if (player.command["ADJUST_ANGLE_DOWN"]) {
		player.angle -= CONST.ANGLE_DELTA;
		if (player.angle < CONST.ANGLE_LOWER_LIMIT) player.angle = CONST.ANGLE_LOWER_LIMIT;
	}
	if (player.command["CHARGE_POWER"]) {
		player.command["CHARGING_POWER"] = true;
		player.command["CHARGE_POWER"] = false;
		player.power = 0;
	}
	if (player.command["CHARGING_POWER"]) {
		player.power += CONST.POWER_DELTA;
		if (player == state.player[CONST.MAIN_PLAYER]) {
			state.powerBar.power = player.power;
		}
	}
	if (player.command["SHOOT"]) {
		state.bullets.push(createBullet(player));
		player.command["SHOOT"] = false;
		state.viewMode["LOCKED_BULLET_VIEW_MODE"] = true;
		state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = false;
	}

}


function movementUpdate(player) {
	var temp = {
		x : player.x,
		y : player.y,
		dir : [player.dir[0], player.dir[1]],
		v : player.v,
	};
	temp.v += CONST.GRAVITY;
	temp.y += temp.v;
	var pivots = computePivots(temp);
	if (checkCollision(pivots[0]) || checkCollision(pivots[1])) {
		temp = resolveTerrainCollision(player, temp);
	}

	setPlayerState(player, temp);

	pivots = computePivots(temp);
	if (checkCollision(pivots[0])||checkCollision(pivots[1])) return;
	temp.x += player.thrust;
	pivots = computePivots(temp);
	if (checkCollision(pivots[0]) || checkCollision(pivots[1])) {
		temp = resolveTerrainCollision(player, temp);
	}

	setPlayerState(player, temp);
}

function createExplosion(x, y, radius) {
	return {
		"x" : x,
		"y" : y,
		"radius" : radius,
		isExploded : false,
	};
}

function bulletUpdate(bullet) {
	if (bullet.x < 0 || bullet.x > CONST.WORLD_WIDTH || bullet.y > CONST.WORLD_HEIGHT) {
		bullet.isAlive = false;
	}
	bullet.x += bullet.v[0];
	bullet.y += bullet.v[1];

	if (checkBulletCollision(bullet)) {
		state.explosions.push(createExplosion(bullet.x, bullet.y+16, CONST.EXPLOSION_RADIUS));
		bullet.isAlive = false;
	}

	var wind = computeWindForce();
	bullet.v[0] += wind[0];
	bullet.v[1] += wind[1] + CONST.GRAVITY;
}

function computeWindForce() {
	var alpha = state.wind.angle * Math.PI / 180;
	var r = state.wind.strength * CONST.WIND_STRENGTH_CALLIBRATOR;
	return [r * Math.cos(alpha), r * Math.sin(alpha)];
}

function checkBulletCollision(bullet) {
	var bulletRect = CONST.BULLET_RADIUS * 0.80;
	var playerRect = CONST.PLAYER_HEIGHT/2 * 0.80;
	for (var i = 0; i < state.player.length; ++i) {
		if (Math.abs(bullet.x - state.player[i].x) < bulletRect + playerRect &&
			Math.abs(bullet.y - state.player[i].y) < bulletRect + playerRect) {
			return true;
		}
	}
	//terrain
	return checkCollision([bullet.x, bullet.y]) || 
	checkCollision([bullet.x - bulletRect, bullet.y - bulletRect]) ||
	checkCollision([bullet.x + bulletRect, bullet.y + bulletRect]) || 
	checkCollision([bullet.x + bulletRect, bullet.y - bulletRect]) ||
	checkCollision([bullet.x - bulletRect, bullet.y + bulletRect]);
}

function setPlayerState(player, temp) {
	player.x = temp.x;
	player.y = temp.y;
	player.dir = temp.dir;
	player.v = temp.v;
}

function checkCollision(coor) {
	var x = coor[0]-state.terrainOffset[0];
	var y = coor[1]-state.terrainOffset[1];
	if (x < 0 || y < 0) return false;

	// var img = state.terrainBuffer.getContext("2d").getImageData(x, y-1, 1, 1);
	// for (var i = 0; i < img.data.length; i += 4) {
	// 	if (img.data[i+3] > CONST.OPAQUE_VALUE) return true;
	// }

	return (state.terrainData.data[Math.floor(y)*state.terrainBuffer.width*4 + Math.floor(x)*4 + 3] > CONST.OPAQUE_VALUE);
}

function computePivots(player) {
	// [front, back]
	var x = player.x;
	var y = player.y;
	var d = player.dir;
	var n = [-d[1], d[0]];
	var h = CONST.PLAYER_HEIGHT*0.5;
	var w = CONST.PLAYER_WIDTH*0.5;
	return [
		[x+w*d[0]+h*n[0], y+w*d[1]+h*n[1]],
		[x-w*d[0]+h*n[0], y-w*d[1]+h*n[1]],
	];
}

function resolveTerrainCollision(player, end) {
	var tmp = {
		x : end.x,
		y : player.y,
		dir : [player.dir[0], player.dir[1]],
		v : CONST.PLAYER_MASS,
	}
	var frontCheck = false, backCheck = false;
	var delta = 1;
	if (checkCollision(computePivots(tmp)[0]) || checkCollision(computePivots(tmp)[1])) {
		for (var i = player.y; i > 0; i -= delta) {
			tmp.y = i;
			var pivots = computePivots(tmp);
			var fcheck = checkCollision(pivots[0]);
			var bcheck = checkCollision(pivots[1]);
			if (!fcheck && !bcheck) {
				break;
			}
			frontCheck = fcheck;
			backCheck = bcheck;
		}
	} else {
		for (var i = player.y; i < end.y; i += delta) {
			tmp.y = i;
			var pivots = computePivots(tmp);
			frontCheck = checkCollision(pivots[0]);
			backCheck = checkCollision(pivots[1]);
			if (frontCheck || backCheck) {
				tmp.y -= delta;
				break;
			}
		}
	}

	if(frontCheck && backCheck) return tmp;

	var pivot, free;
	var pivots = [computePivots(tmp), computePivots(end)];
	if (frontCheck) {
		pivot = pivots[0][0];
		free = pivots[1][1];
	} else {
		pivot = pivots[0][1];
		free = pivots[1][0];
	}
	var d = [free[0]-pivot[0], free[1]-pivot[1]];
	normalize(d);

	free = [pivot[0]+d[0]*CONST.PLAYER_WIDTH, pivot[1]+d[1]*CONST.PLAYER_WIDTH];
	while (checkCollision(free)) {
		rotate(d, 0.4*Math.PI/180 * (frontCheck ? -1 : 1));
		free[0] = pivot[0]+d[0]*CONST.PLAYER_WIDTH;
		free[1] = pivot[1]+d[1]*CONST.PLAYER_WIDTH;
	}

	var n = [-d[1], d[0]];
	if (d[0] < 0) {
		n[0] = -n[0];
		n[1] = -n[1];
	}
	tmp.x = pivot[0]+d[0]*CONST.PLAYER_WIDTH*0.5-n[0]*CONST.PLAYER_HEIGHT*0.5;
	tmp.y = pivot[1]+d[1]*CONST.PLAYER_WIDTH*0.5-n[1]*CONST.PLAYER_HEIGHT*0.5;
	if(d[0] < 0) {
		d[0] = -d[0];
		d[1] = -d[1];
	}
	tmp.dir = d;
	return tmp;
}

function normalize(d) {
	var len = Math.sqrt(d[0]*d[0]+d[1]*d[1]);
	d[0] /= len;
	d[1] /= len;
}

function rotate(d, theta) {
	// positive theta => anti-clockwise direction convention.
	var x = d[0], y = d[1];
	d[0] = x*Math.cos(theta) + y*Math.sin(theta);
	d[1] = -x*Math.sin(theta) + y*Math.cos(theta);
}


function createBullet(player) {
	var bullet = {};
	var d = [player.orientation * player.dir[0], player.orientation * player.dir[1]];
	rotate(d, player.orientation * player.angle * Math.PI/180);
	bullet.x = player.x + d[0] * (CONST.BARREL_WIDTH + 20);
	bullet.y = player.y + d[1] * (CONST.BARREL_WIDTH + 20);
	var v = player.power / CONST.MAX_POWER * CONST.MAX_BULLET_THRUST;
	bullet.v = [v * d[0], v * d[1]];
	bullet.isAlive = true;
	return bullet;
}


function initializeAsset() {
	state.terrainBuffer = testAssets.get("test_asset04");
	state.terrainData = state.terrainBuffer.getContext("2d").getImageData(0, 0, state.terrainBuffer.width, state.terrainBuffer.height);

}






function render() {
	state.g.fillStyle = "white";
	state.g.fillRect(0, 0, state.display.width, state.display.height);

	state.g.save();
	state.g.translate(state.viewOffset[0], state.viewOffset[1]);
	renderTerrain();
	for(var i = 0; i < state.player.length; ++i) {
		renderPlayer(state.player[i]);
	}
	for(var i = 0; i < state.bullets.length; ++i) {
		renderBullet(state.bullets[i]);
	}
	state.g.restore();
	renderControlBar();
}

function renderTerrain() {
	state.g.drawImage(state.terrainBuffer, 0, 0, state.terrainBuffer.width, state.terrainBuffer.height,
						state.terrainOffset[0], state.terrainOffset[1], state.terrainBuffer.width, state.terrainBuffer.height
	);
}

function renderControlBar() {
	var g = state.g;
	g.save();
	g.fillStyle = CONST.CONTROL_BAR_COLOR;
	g.lineWidth = 3;
	g.fillRect(0, state.display.height - CONST.CONTROL_BAR_HEIGHT, state.display.width, CONST.CONTROL_BAR_HEIGHT);
	renderPowerBar();
	renderWindCompass();

	g.restore();
}

function renderWindCompass() {
	var g = state.g;
	g.save();
		g.translate(state.display.width/2, 80);
		g.save();
			g.rotate((state.wind.angle + 90) * Math.PI/180);
			gameAsset.renderAsset("wind_compass", g);
		g.restore();
		g.drawImage(state.wind.bufferCaption, 0, 0, state.wind.bufferCaption.width, state.wind.bufferCaption.height, -state.wind.bufferCaption.width/2, -state.wind.bufferCaption.height/2, state.wind.bufferCaption.width, state.wind.bufferCaption.height);
	g.restore();
}

function setWind(angle, strength) {
	state.wind.angle = angle;
	state.wind.strength = strength;
	state.wind.bufferCaption = createText(""+strength, 40);
}

function createText(text, size) {
	var buffer = document.createElement("canvas");
	var g = buffer.getContext("2d");
	g.font = size+"px Arial";
	g.fillStyle = "white";
	buffer.width = g.measureText(text).width;
	buffer.height = size * 1.1;
	g.fillStyle = "rgba(255, 255, 255, 0.9)";
	g.font = size+"px Arial";
	g.shadowColor = "black";
	g.shadowBlur = "10";
	g.fillText(text, 0, buffer.height / 1.1);

	return buffer;
}

function renderPowerBar() {
	var g = state.g;
	g.save();
	g.fillStyle = CONST.POWER_BAR_COLOR;
	g.fillRect(state.display.width * (1-CONST.POWER_BAR_RATIO), state.display.height - CONST.POWER_BAR_HEIGHT, state.display.width * CONST.POWER_BAR_RATIO, CONST.POWER_BAR_HEIGHT);
	var activePowerWidth = (state.display.width * CONST.POWER_BAR_RATIO - 8) * state.powerBar.power / CONST.MAX_POWER;
	g.fillStyle = CONST.POWER_BAR_ACTIVE_COLOR;
	g.fillRect(state.display.width * (1-CONST.POWER_BAR_RATIO) + 4, state.display.height - CONST.POWER_BAR_HEIGHT + 4, activePowerWidth, CONST.POWER_BAR_HEIGHT - 8);
	g.restore();
}

function renderBullet(bullet) {
	var theta = Math.atan2(bullet.v[1], bullet.v[0]);
	var g = state.g;
	g.save();
	g.fillStyle = "#f01";
	g.lineWidth = 3;
	// g.beginPath();
	// g.arc(bullet.x, bullet.y, CONST.BULLET_RADIUS, 0, 2*Math.PI);
	// g.fill();
	g.translate(bullet.x, bullet.y);
	g.rotate(theta);
	g.fillRect(-CONST.BULLET_RADIUS - 10,-CONST.BULLET_RADIUS, CONST.BULLET_RADIUS+20, CONST.BULLET_RADIUS*2);
	g.fillStyle = "white"
	g.fillRect(-CONST.BULLET_RADIUS ,-CONST.BULLET_RADIUS, 10, CONST.BULLET_RADIUS*2);
	g.strokeRect(-CONST.BULLET_RADIUS - 10,-CONST.BULLET_RADIUS, CONST.BULLET_RADIUS+20, CONST.BULLET_RADIUS*2);
	g.restore();
}

function renderPlayer(player) {
	var theta = Math.atan2(player.dir[1], player.dir[0]);

	var g = state.g;
	g.save();
	g.translate(player.x, player.y);
	g.rotate(theta);


	// body
	g.fillStyle = player.color;
	g.lineWidth = 3;
	g.fillRect(-CONST.PLAYER_WIDTH/2, -CONST.PLAYER_HEIGHT/2, CONST.PLAYER_WIDTH, CONST.PLAYER_HEIGHT);
	g.strokeRect(-CONST.PLAYER_WIDTH/2, -CONST.PLAYER_HEIGHT/2, CONST.PLAYER_WIDTH, CONST.PLAYER_HEIGHT);

	// barrel
	g.save();
	g.scale(player.orientation, 1);
	g.rotate(-player.angle * Math.PI/180);
	g.fillStyle = CONST.BARREL_COLOR;
	g.lineWidth = 2;
	g.fillRect(0, -CONST.BARREL_HEIGHT/2, CONST.BARREL_WIDTH, CONST.BARREL_HEIGHT);
	g.strokeRect(0, -CONST.BARREL_HEIGHT/2, CONST.BARREL_WIDTH, CONST.BARREL_HEIGHT);
	g.restore();

	g.restore();


	// var ret = computePivots(state.player);
	// g.fillStyle = "black";
	// g.fillRect(ret[0][0]-5, ret[0][1]-5, 10, 10);
	// g.fillStyle = "blue";
	// g.fillRect(ret[1][0]-5, ret[1][1]-5, 10, 10);
}



