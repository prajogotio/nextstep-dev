var gameAsset = (function() {
	var asset = {};

	asset.buffer = document.createElement("canvas");
	asset.buffer.width = 1000;
	asset.buffer.height = 1000;

	var g = asset.buffer.getContext("2d");
	g.clearRect(0, 0, asset.buffer.width, asset.buffer.height);

	// main getter function
	asset.renderAsset = function(name, g) {
		g.drawImage(asset.buffer, asset[name].offsetX, asset[name].offsetY, asset[name].width, asset[name].height,
					-asset[name].width/2, -asset[name].height/2, asset[name].width, asset[name].height);
	}

	// wind compass
	asset["wind_compass"] = {
		offsetX : 0,
		offsetY : 0,
		width : 100,
		height : 100,
	}

	// draw wind compass
	g.save();
	g.translate(asset["wind_compass"].offsetX, asset["wind_compass"].offsetY);
	g.fillStyle = "rgba(0,0,0,0.5)";
	g.lineWidth = 5;
	g.beginPath();
	g.arc(asset["wind_compass"].width/2, asset["wind_compass"].width/2, asset["wind_compass"].width/2-5, 0, 2*Math.PI);
	g.fill();
	g.stroke();
	g.beginPath();
	g.fillStyle = "rgba(22, 170, 131, 0.8)";
	g.moveTo(asset["wind_compass"].width/2, asset["wind_compass"].width/2 + 20);
	g.lineTo(asset["wind_compass"].width/2 - 20, asset["wind_compass"].width/2 + 30);
	g.lineTo(asset["wind_compass"].width/2, asset["wind_compass"].width/2 - 30);
	g.lineTo(asset["wind_compass"].width/2 + 20, asset["wind_compass"].width/2 + 30);
	g.closePath();
	g.fill();
	g.stroke();
	g.restore();



	// green terrain bits
	asset["green_terrain_bits"] = {
		offsetX : 100,
		offsetY : 0,
		width : 40,
		height : 40,
	}
	g.save();
	g.fillStyle = "green";
	g.lineWidth = 3;
	g.translate(100, 0);
	g.beginPath();
	g.moveTo(13,9);
	g.lineTo(7,17);
	g.lineTo(5,26);
	g.lineTo(12,32);
	g.lineTo(20,32);
	g.lineTo(26,36);
	g.lineTo(33,31);
	g.lineTo(32,19);
	g.lineTo(33,9);
	g.lineTo(24,8);
	g.closePath();
	g.fill();
	g.stroke();
	g.restore();


	// degree circle
	asset["degree_circle"] = {
		offsetX : 0,
		offsetY : 100,
		width : 30,
		height : 30,
	}
	g.save();
	g.translate(0, 100);
	g.font = "bold 20px Arial";
	g.fillStyle = "white";
	g.strokeStyle = "black";
	g.lineWidth = 1;
	g.fillText("o", 10, 15);
	g.strokeText("o", 10, 15);
	g.restore();

	// angle protractor
		asset["angle_protractor"] = {
		offsetX : 30,
		offsetY : 100,
		width : 100,
		height : 100,
	}
	g.save();
	g.translate(30, 100);

	g.fillStyle = "rgba(240, 240, 0, 0.3)";
	g.beginPath();
	g.moveTo(0,100);
	//g.lineTo(80,100);
	g.arc(0, 100, 80, 0, Math.PI/2, true);
	//g.lineTo(0,80);
	g.closePath();
	g.fill();

	

	g.beginPath();
	g.fillStyle = "rgba(0,0,0,0.5)";
	g.strokeStyle = "rgba(0,0,0,0.5)";
	g.lineWidth = 2;
	g.arc(0, 100, 80, 0, Math.PI/2, true);
	g.stroke();
	g.fillRect(0, 20, 2, 30);
	g.fillRect(50, 98, 30, 2);

	g.restore();


	return asset;
})();