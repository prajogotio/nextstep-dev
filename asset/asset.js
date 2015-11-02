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

	return asset;
})();