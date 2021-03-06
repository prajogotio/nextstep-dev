addEventListener("DOMContentLoaded", function() {
	initialize();
	startGame();
});

var state = {
	player : [],
	viewMode : {},
	viewOffset : [0, 0],
	terrainOffset : [100, 0],
	powerBar : {
		power : 0,
		marker : 0,
	},
	bullets : [],
	explosions : [],
	effects : [],
	wind : {
		angle : -90,
		strength : 0,
		bufferedCaption : createText("0", 50, "white", 2, "black"),
	},
	terrainBitsName : null,
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
	WORLD_WIDTH : 2000,
	WORLD_HEIGHT : 1000,
	BARREL_WIDTH : 50,
	BARREL_HEIGHT: 16,
	BARREL_COLOR : "#fff",
	CONTROL_BAR_COLOR : "rgba(0,0,0,0.6)",
	CONTROL_BAR_HEIGHT : 100,
	CONTROL_BAR_WIDTH : 1000,
	MAX_POWER : 200,
	POWER_BAR_HEIGHT : 40,
	POWER_BAR_COLOR : "#000",
	POWER_BAR_RATIO : 0.8,
	POWER_DELTA : 1,
	POWER_BAR_ACTIVE_COLOR : "#f00",
	ANGLE_BAR_WIDTH : 80,
	BULLET_RADIUS : 10,
	MAX_BULLET_THRUST : 50,
	MAX_WIND_STRENGTH : 10,
	EXPLOSION_RADIUS : 60,
	WIND_STRENGTH_CALLIBRATOR : 0.02,
	HEALTH_BAR_LENGTH : 80,
	VIEW_SHIFT_RATIO : 1.5,
	CAMERA_VIEW_UPPERLIMIT : 800,
	PLAYER_VERTICAL_MOVEMENT_LIMIT : 8,
	MAX_ITEM_BAR_SLOTS : 3,
	ITEM_SLOT_WIDTH : 200,
	ITEM_HEALTH_UP_EFFECT : 500,
};

function initialize() {
	state.display = document.getElementById("display");
	state.display.width = window.innerWidth;
	state.display.height = window.innerHeight;
	state.g = display.getContext("2d");
	initializeAsset();
}


function initializeAsset() {
	state.terrainBitsName = "green_terrain_bits";
	state.terrainBuffer = testAssets.get("test_asset03");
	state.terrainData = state.terrainBuffer.getContext("2d").getImageData(0, 0, state.terrainBuffer.width, state.terrainBuffer.height);
}

function spawnPlayers() {
	var startHeight = 0;
	state.player.push(new Player(state.display.width/2, startHeight, "#fab", "prajogo"));
	state.player.push(new Player(state.display.width/2 + 300, startHeight, "#8af", "chang_Hong"));
	state.player.push(new Player(state.display.width/2 + 800, startHeight, "#8e7", "chinjieh"));
	state.player.push(new Player(state.display.width/2 - 400, startHeight, "#99a", "nigel"));
}


function startGame() {
	spawnPlayers();
	registerEventListener();

	var timer = setInterval(function(){
		update();
		render();
	}, CONST.TIME_DELTA);

}

function computeMouseOffset(e) {
	return [e.pageX - state.display.offsetLeft, e.pageY - state.display.offsetTop];
}

function registerEventListener() {
	addEventListener("mousedown", function(e) {
		if (onControlBar(e)) {
			handleControlBarMouseClick(e);
			return;
		}
		state.viewMode["SHIFT_VIEW_MODE"] = true;
		state.shiftOrigin = computeMouseOffset(e);
		state.mouseOffset = computeMouseOffset(e);
		state.prevViewOffset = [state.viewOffset[0], state.viewOffset[1]];
	});
	addEventListener("mouseup", function(e) {
		state.viewMode["SHIFT_VIEW_MODE"] = false;
	})
	addEventListener("mousemove", function(e) {
		state.mouseOffset = computeMouseOffset(e);
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

function onControlBar(e) {
	var offset = computeMouseOffset(e);
	var x = (state.display.width - CONST.CONTROL_BAR_WIDTH)/2;
	var y = state.display.height - CONST.CONTROL_BAR_HEIGHT;
	return (x < offset[0] && offset[0] < x + CONST.CONTROL_BAR_WIDTH && 
		y < offset[1] && offset[1] < y + CONST.CONTROL_BAR_HEIGHT);
}

function handleControlBarMouseClick(e) {
	var offset = computeMouseOffset(e);
	var x = (state.display.width - CONST.CONTROL_BAR_WIDTH)/2;
	var y = state.display.height - CONST.CONTROL_BAR_HEIGHT;
	offset[0] -= x;
	offset[1] -= y;
	if (offset[1] > CONST.CONTROL_BAR_HEIGHT - CONST.POWER_BAR_HEIGHT) {
		setPowerMarker(offset[0]/CONST.CONTROL_BAR_WIDTH);
		return;
	}
	//check item bar
	if (!state.player[CONST.MAIN_PLAYER].command["USE_ITEM"] || state.player[CONST.MAIN_PLAYER].command["USE_ITEM"].use == false) {
		for (var i = 0; i < CONST.MAX_ITEM_BAR_SLOTS; ++i) {
			if (i*CONST.ITEM_SLOT_WIDTH < offset[0] - CONST.ANGLE_BAR_WIDTH && offset[0] - CONST.ANGLE_BAR_WIDTH < (i+1)*CONST.ITEM_SLOT_WIDTH) {
				state.player[CONST.MAIN_PLAYER].command["USE_ITEM"] = {use : true, which : i};
			}
		}
	}
}

function update() {
	cameraEventsHandler();

	updateExplosions();
	updatePlayers();
	updateBullets();
}

function updateExplosions() {
	for (var i = 0; i < state.explosions.length; ++i) {
		updateExplosion(state.explosions[i]);
	}
	state.explosions = [];
}

function updatePlayers() {
	for(var i = 0; i < state.player.length;++i) {
		state.player[i].commandHandler(state);
		state.player[i].movementUpdate();;
	}
}

function updateBullets() {
	var tmp = [];
	for (var i = 0; i < state.bullets.length; ++i) {
		state.bullets[i].update(state);
		if (state.bullets[i].isAlive) tmp.push(state.bullets[i]);
	}
	state.bullets = tmp;
}

function cameraEventsHandler() {
	if (state.viewMode["SHIFT_VIEW_MODE"]) {
		state.viewMode["LOCKED_PLAYER_VIEW_MODE"] = false;
		var dx = state.mouseOffset[0] - state.shiftOrigin[0];
		var dy = state.mouseOffset[1] - state.shiftOrigin[1];
		state.viewOffset = [state.prevViewOffset[0] + dx * CONST.VIEW_SHIFT_RATIO, state.prevViewOffset[1] + dy * CONST.VIEW_SHIFT_RATIO];
	}
	else if (state.viewMode["LOCKED_BULLET_VIEW_MODE"]) {
		if (state.bullets.length == 0) {
			state.viewMode["LOCKED_BULLET_VIEW_MODE"] = false;
		} else {
			var d = [-state.bullets[0].x + state.display.width/2, -state.bullets[0].y + state.display.height/2];
			state.viewOffset[0] -= (state.viewOffset[0] - d[0])*0.21;
			state.viewOffset[1] -= (state.viewOffset[1] - d[1])*0.21;
		}
	}
	else if (state.viewMode["LOCKED_PLAYER_VIEW_MODE"]) {
		state.viewOffset[0] = -state.player[CONST.MAIN_PLAYER].x + state.display.width/2;
		state.viewOffset[1] = -state.player[CONST.MAIN_PLAYER].y + state.display.height/2;
	}
	if (state.viewOffset[1] > CONST.CAMERA_VIEW_UPPERLIMIT) state.viewOffset[1] = CONST.CAMERA_VIEW_UPPERLIMIT;
	if (state.viewOffset[1] < -CONST.WORLD_HEIGHT/2) state.viewOffset[1] = -CONST.WORLD_HEIGHT/2;
	if (state.viewOffset[0] > 0) state.viewOffset[0] = 0;
	if (state.viewOffset[0] < -CONST.WORLD_WIDTH/2)  state.viewOffset[0] = -CONST.WORLD_WIDTH/2;
}

function updateExplosion(explosion) {
	if(!explosion.isExploded) {
		checkPlayerExplosionCollision(explosion);
		explosion.isExploded = true;
	}
	destroyTerrainEffect(explosion);
}

function checkPlayerExplosionCollision(explosion) {
	for (var i = 0; i < state.player.length; ++i) {
		var player = state.player[i];
		var dx = explosion.x - player.x;
		var dy = explosion.y - player.y;
		var dist = Math.sqrt(dx*dx + dy*dy);
		if (dist < explosion.radius + player.PLAYER_WIDTH/2) {
			player.receiveDamage(explosion.damage *  (1 - dist/(explosion.radius+player.PLAYER_WIDTH/2)));
		}
	}
}

function destroyTerrainEffect(explosion) {
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

function createExplosion(x, y, radius, damage) {
	return {
		"x" : x,
		"y" : y,
		"radius" : radius,
		"damage" : damage,
		isExploded : false,
	};
}

function computeWindForce() {
	var alpha = state.wind.angle * Math.PI / 180;
	var r = state.wind.strength;
	return [r * Math.cos(alpha), r * Math.sin(alpha)];
}

function checkBulletCollision(bullet) {
	var collided = false;
	var bulletRect = bullet.BULLET_RADIUS * 0.80;
	for (var i = 0; i < state.player.length; ++i) {
		var playerRect = state.player[i].PLAYER_HEIGHT/2 * 0.80;
		if (Math.abs(bullet.x - state.player[i].x) < bulletRect + playerRect &&
			Math.abs(bullet.y - state.player[i].y) < bulletRect + playerRect) {
			collided = true;
			break;
		}
	}
	//terrain
	if(checkCollision([bullet.x, bullet.y]) || 
	checkCollision([bullet.x - bulletRect, bullet.y - bulletRect]) ||
	checkCollision([bullet.x + bulletRect, bullet.y + bulletRect]) || 
	checkCollision([bullet.x + bulletRect, bullet.y - bulletRect]) ||
	checkCollision([bullet.x - bulletRect, bullet.y + bulletRect]) ) {
		collided = true;
		createDestroyedTerrainEffect(bullet, state.terrainBitsName);
	}

	return collided;
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





function render() {
	state.g.fillStyle = "white";
	state.g.fillRect(0, 0, state.display.width, state.display.height);

	state.g.save();
	state.g.translate(state.viewOffset[0], state.viewOffset[1]);
	renderTerrain();
	renderPlayers();
	renderBullets();
	renderEffects();
	state.g.restore();

	renderControlBar();
}

function renderPlayers() {
	for(var i = 0; i < state.player.length; ++i) {
		state.player[i].render(state.g);
	}
}

function renderBullets() {
	for(var i = 0; i < state.bullets.length; ++i) {
		state.bullets[i].render(state.g);
	}
}

function renderEffects() {
	var tmp = [];
	for (var i = 0; i < state.effects.length; ++i) {
		state.effects[i].render(state.g);
		if (state.effects[i].isAlive) tmp.push(state.effects[i]);
	}
	state.effects = tmp;
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
	g.fillRect((state.display.width - CONST.CONTROL_BAR_WIDTH)/2, state.display.height - CONST.CONTROL_BAR_HEIGHT, CONST.CONTROL_BAR_WIDTH, CONST.CONTROL_BAR_HEIGHT);
	renderPowerBar();
	renderWindCompass();
	renderAngleBar();
	renderItemBar();
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
		g.drawImage(state.wind.bufferedCaption, 0, 0, state.wind.bufferedCaption.width, state.wind.bufferedCaption.height, -state.wind.bufferedCaption.width/2, -state.wind.bufferedCaption.height/2, state.wind.bufferedCaption.width, state.wind.bufferedCaption.height);
	g.restore();
}

function renderItemBar() {
	var g = state.g;
	g.save();
	g.translate((state.display.width - CONST.CONTROL_BAR_WIDTH)/2 + CONST.ANGLE_BAR_WIDTH, 
				state.display.height - CONST.CONTROL_BAR_HEIGHT);
	var h = CONST.CONTROL_BAR_HEIGHT - CONST.POWER_BAR_HEIGHT;
	g.fillStyle = "rgba(30,30,30,0.7)";
	g.strokeStyle = "rgba(120, 120, 45, 0.4)";
	g.lineWidth = 2;


	for (var i = 0; i < CONST.MAX_ITEM_BAR_SLOTS; ++i) {
		g.fillRect(i * CONST.ITEM_SLOT_WIDTH , 0, CONST.ITEM_SLOT_WIDTH, h);
	}

	for (var i = 0; i < CONST.MAX_ITEM_BAR_SLOTS; ++i) {
		if (state.player[CONST.MAIN_PLAYER].itemSlot[i] != "empty") {
			g.save();
			g.translate(i * CONST.ITEM_SLOT_WIDTH + CONST.ITEM_SLOT_WIDTH/2, h/2);
			gameAsset.renderAsset(state.player[CONST.MAIN_PLAYER].itemSlot[i], g);
			g.restore();
		} 
	}
	
	for(var i = 0; i < CONST.MAX_ITEM_BAR_SLOTS; ++i) {
		g.strokeRect(i * CONST.ITEM_SLOT_WIDTH, 0, CONST.ITEM_SLOT_WIDTH, h);
	}

	g.restore();
}

function setWind(angle, strength) {
	state.wind.angle = angle;
	state.wind.strength = strength;
	state.wind.bufferedCaption = createText(""+strength, 40, "white", 2, "black");
}

function createText(text, size, color, lineWidth, strokeColor, font) {
	var buffer = document.createElement("canvas");
	var g = buffer.getContext("2d");
	g.font = size+"px " + (font || "Arial");
	buffer.width = g.measureText(text).width;
	buffer.height = size * 1.1;

	g.font = size+"px " + (font || "Arial");
	g.fillStyle = color;
	g.fillText(text, 0, buffer.height/1.3);
	if (strokeColor) {
		g.strokeStyle = strokeColor;
		g.lineWidth = lineWidth;
		g.strokeText(text, 0, buffer.height/1.3);
	}
	return buffer;
}

function setPowerMarker(x) {
	state.powerBar.marker = x;
}

function renderPowerBar() {
	var g = state.g;
	g.save();
	g.fillStyle = CONST.POWER_BAR_COLOR;
	var x = (state.display.width - CONST.CONTROL_BAR_WIDTH)/2;
	var y = state.display.height - CONST.POWER_BAR_HEIGHT;
	g.fillRect(x, y, CONST.CONTROL_BAR_WIDTH, CONST.POWER_BAR_HEIGHT);
	var activePowerWidth = (CONST.CONTROL_BAR_WIDTH - 8) * state.powerBar.power / CONST.MAX_POWER;
	g.fillStyle = CONST.POWER_BAR_ACTIVE_COLOR;
	g.fillRect(x + 4, y + 4, activePowerWidth, CONST.POWER_BAR_HEIGHT - 8);

	g.strokeStyle = "white";
	g.lineWidth = 2;
	for (var i = 0; i < 4; ++i) {
		g.strokeRect(x+1+i*CONST.CONTROL_BAR_WIDTH/4, y+1, (CONST.CONTROL_BAR_WIDTH-5)/4, CONST.POWER_BAR_HEIGHT-2);
	}
	g.fillStyle = "yellow"
	g.fillRect(x + state.powerBar.marker * CONST.CONTROL_BAR_WIDTH, y+1, 7, CONST.POWER_BAR_HEIGHT-2);
	g.restore();
}

function renderAngleBar() {
	var g = state.g;
	var x = (state.display.width - CONST.CONTROL_BAR_WIDTH)/2;
	var y = state.display.height - CONST.CONTROL_BAR_HEIGHT;
	var h = CONST.CONTROL_BAR_HEIGHT - CONST.POWER_BAR_HEIGHT;

	var p = state.player[CONST.MAIN_PLAYER];
	var d = [p.dir[0] * p.orientation, p.dir[1] * p.orientation];
	d[0] = Math.floor(d[0] * 100)/100;
	d[1] = Math.floor(d[1] * 100)/100;
	rotate(d, Math.floor(p.angle) * p.orientation / 180 * Math.PI);
	var theta = Math.floor(Math.atan2(d[1], d[0])/Math.PI*180);
	theta = -theta;
	if (theta > 90) theta = 180 - theta;
	if (theta < -90) theta = -180 - theta;
	g.fillStyle = "rgba(244, 244, 0, 0.6)";
	g.fillRect(x, y, CONST.ANGLE_BAR_WIDTH, h);
	g.fillStyle = "white";
	if (theta < 0) {
		theta = -theta;
		g.fillStyle = "rgba(244, 10, 0, 0.6)";
	}
	g.strokeStyle = "black";
	g.font = "bold 45px Arial";
	g.lineWidth = 2;
	var offsetY = 45;
	g.fillText(theta, x + 12, y + offsetY);
	g.strokeText(theta, x + 12, y + offsetY);
	g.save();
	g.translate(x+67, y+16);
	gameAsset.renderAsset("degree_circle", g);
	g.restore();
}

function createDamageEffect(x, y, dmg) {
	var damageEffect = {};
	damageEffect.x = x;
	damageEffect.y = y;
	damageEffect.delta = 40;
	damageEffect.isAlive = true;
	damageEffect.caption = createText(""+Math.floor(dmg), 30, "red", 1, "black");
	damageEffect.render = function(g){
		if (!damageEffect.isAlive) return;
		var w = damageEffect.caption.width;
		var h = damageEffect.caption.height;
		damageEffect.y -= 1;
		g.drawImage(damageEffect.caption, 0, 0, w, h, damageEffect.x - w/2, damageEffect.y - h/2, w, h);
		damageEffect.delta--;
		if (damageEffect.delta <= 0) damageEffect.isAlive = false;
	}
	state.effects.push(damageEffect);
}

function createDestroyedTerrainEffect(bullet, assetName) {
	function generator(x, y, spin, dir, assetName) {
		var effect = {};
		effect.x = x;
		effect.y = y;
		effect.isAlive = true;
		effect.dir = dir;
		effect.spin = spin;
		effect.render = function(g) {
			effect.dir[1] += CONST.GRAVITY;
			effect.y += effect.dir[1];
			effect.x += effect.dir[0];
			effect.spin += (effect.spin > 0 ? 1 : -1) * Math.PI/180;
			g.save();
			g.translate(effect.x, effect.y);
			g.rotate(effect.spin);
			gameAsset.renderAsset(assetName, g);
			g.restore();
			if (effect.y > CONST.WORLD_HEIGHT) effect.isAlive = false;
		}
		return effect;
	}
	var force = 15;
	for (var i = 0; i < 3; ++ i) {
		state.effects.push(generator(bullet.x+Math.random()*force-force/2, bullet.y+Math.random()*force-force/2, Math.random()-0.5, [bullet.v[0] + Math.random()*force - force/2, bullet.v[1] + Math.random()*force - force/2], assetName));
	}
}

function createUseItemEffect(player) {
	var effect = {};
	effect.x = player.x;
	effect.y = player.y;
	effect.r = 7;
	effect.delta = 50;
	effect.isAlive = true;
	effect.render = function(g) {
		if (effect.r < 70) effect.r *= 1.09;
		effect.delta--;
		g.beginPath();
		g.fillStyle = "rgba(200, 244, 120, 0.5)";
		g.arc(effect.x, effect.y, effect.r, 0, 2*Math.PI);
		g.fill();
		if (effect.delta <= 0) effect.isAlive = false;
	}
	return effect;
}
