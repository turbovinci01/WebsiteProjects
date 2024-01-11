const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

const tools = document.getElementById("tools");
const gates = document.getElementById("gates");
const compactGates = document.getElementById('compactGates');
const body = document.getElementById("body");
const gridSize = document.getElementById("gridSize");

const drawModeInput = document.getElementById("drawMode");
	
drawModeInput.addEventListener('change', updateDrawMode);

const compactInput = document.getElementById("compactExport");

compactInput.addEventListener('change', updateCompactExport);

gridSize.addEventListener("blur", draw);

selected = ["remove", null]

let targetTPS = 4;
let tickInterval = 1000 / targetTPS;
let isAnimating = false;
let animationFrameId;

let lastTimestamp = 0;

function runCode() {
	eval(codeToRun.value);
}

const inputTargetTPS = document.getElementById("targetTPS");

inputTargetTPS.addEventListener('change', function() {
	setTargetTPS(Number(inputTargetTPS.value));
});

const inputCompactName = document.getElementById("compactName");

const startAndStop = document.getElementById("startAndStop");

startAndStop.addEventListener('change', startAndStopSim);

function startAndStopSim() {
	if (startAndStop.checked) {
		startAnimation();
	} else {
		stopAnimation();
	}
}

compact = true;

function updateCompactExport() {
	compact = compactInput.checked;

	draw();
}

drawMode = false;

function updateDrawMode() {
	drawMode = drawModeInput.checked;

	draw();
}

function gateUsed(gate, type) {
	if (type === 0) {
		const child = gates.children[gate];

		select("div", [child, gate]);
	}

	if (type === 1) {
		const child = compactGates.children[gate - numberOfRegualarGates];

		select("div", [child, gate]);
	}
}

// Function to find the lowest available key
function findLowestAvailableKey(dictionary) {
	const keys = Object.keys(dictionary).map(Number).sort((a, b) => a - b);

	// Iterate through the sorted keys, looking for the first gap
	for (let i = 1; i <= keys.length + 1; i++) {
		if (!keys.includes(i)) {
			return i; // Return the first available key
		}
	}

	// If all keys are taken, return the next positive integer after the largest key
	return keys.length > 0 ? keys[keys.length - 1] + 1 : 1;
}

function createGate(mode, pos, gPos) {
	const bestId = findLowestAvailableKey(data["objects"]);

	if (mode >= numberOfRegualarGates) {
		let item = JSON.parse(localStorage.getItem("compactGates"))[mode - numberOfRegualarGates];

		data["objects"][bestId] = {
			"x": pos[0],
			"y": pos[1],
			"gx": gPos[0],
			"gy": gPos[1],
			"mode": "compact",
			"controllers": [],
			"active": [],
			"activeNew": [],
			"controlled": [],
			"input": 0,
			"internal": {
				"name": item["name"],
				"data": item["data"]
			}
		}
	} else {
		data["objects"][bestId] = { "x": pos[0], "y": pos[1], "gx": gPos[0], "gy": gPos[1], "mode": mode, "controllers": [], "active": false, "activeNew": false, "controlled": [], "input": 0 }
	}

	if (gPos[0] != null) {
		if (getValueFromRoster(data["map"], gPos[0], gPos[1]) != null) {
			let deleteId = getValueFromRoster(data["map"], gPos[0], gPos[1]); 

			deleteGate(deleteId);
		}
		
		setValueInRoster(data["map"], gPos[0], gPos[1], bestId);
	}
	
	return bestId;
}

function sortObjects(dictionary) {
	// Get an array of keys from the dictionary
	const keysArray = Object.keys(dictionary);

	// Sort the keys based on Y value first, then X value
	keysArray.sort((key1, key2) => {
		const obj1 = dictionary[key1];
		const obj2 = dictionary[key2];

		// Compare Y values
		if (obj1.gy !== obj2.gy) {
			return obj1.gy - obj2.gy;
		}

		// If Y values are the same, compare X values
		return obj1.gx - obj2.gx;
	});

	return keysArray;
}

canvas.addEventListener("mouseenter", function() {
	if (selected[0] === "div") {
		
		select("gate", createGate(selected[1][1], getMousePos(canvas), [null, null]));
	}
});

function select(type, input) {
	if (selected[0] === "div") {
		selected[1][0].style.backgroundColor = "white";
	}
	
	if (type === "div") {
		input[0].style.backgroundColor = "grey";
	}

	selected = [type, input];
}

nameToMode = {"and": 0, "or": 1, "xor": 2, "nand": 3, "nor": 4, "xnor": 5};
modeToName = ["and", "or", "xor", "nand", "nor", "xnor"];

data = {
	"objects":{
		1:{"x":1, "y":1, "gx":1, "gy":1, "mode":0, "controllers":[], "active":false, "activeNew":false, "controlled":[], "input":0}
	}, "map":{
		1:{1:1}
	}
}

canvas.addEventListener("mousedown", mouseDown);

window.addEventListener("mouseup", mouseUp);

function connectGates(id1, id2) {
	if (data["objects"].hasOwnProperty(id1) && data["objects"].hasOwnProperty(id2) && id1 != id2) {
		if (data["objects"][id1]["controllers"].includes(id2) || data["objects"][id2]["controlled"].includes(id1)) {

			data["objects"][id1]["controllers"] = data["objects"][id1]["controllers"].filter(item => item !== id2);

			data["objects"][id2]["controlled"] = data["objects"][id2]["controlled"].filter(item => item !== id1);
			
		} else if (data["objects"][id1]["controlled"].includes(id2) || data["objects"][id2]["controllers"].includes(id1)) {
			
			data["objects"][id1]["controlled"] = data["objects"][id1]["controlled"].filter(item => item !== id2);

			data["objects"][id2]["controllers"] = data["objects"][id2]["controllers"].filter(item => item !== id1);
			
			data["objects"][id1]["controllers"].push(id2);

			data["objects"][id2]["controlled"].push(id1);
			
		} else {
			
			data["objects"][id1]["controllers"].push(id2);

			data["objects"][id2]["controlled"].push(id1);
			
		}
	}
}

function deleteGate(id) {
	if (data["objects"].hasOwnProperty(id)) {
		
		if (data["objects"][id]["gx"] != null) {
			let x = data["objects"][id]["gx"];
			let y = data["objects"][id]["gy"];
			
			setValueInRoster(data["map"], x, y, null)
		}

		for (let i = 0; i < data["objects"][id]["controlled"].length; i += 1){
			
			id2 = data["objects"][id]["controlled"][i];

			if (data["objects"].hasOwnProperty(id2)){

				data["objects"][id2]["controllers"] = data["objects"][id2]["controllers"].filter(item => item !== id);
				
			}
		}

		for (let i = 0; i < data["objects"][id]["controllers"].length; i += 1) {

			id2 = data["objects"][id]["controllers"][i];

			if (data["objects"].hasOwnProperty(id2)) {

				data["objects"][id2]["controlled"] = data["objects"][id2]["controlled"].filter(item => item !== id);

			}
		}
		
		delete data["objects"][id];

	}
}

function getValueFromRoster(roster, x, y) {
  // Check if the x coordinate exists in the roster
  if (roster.hasOwnProperty(x)) {
	// Check if the y coordinate exists in the x dictionary
	if (roster[x].hasOwnProperty(y)) {
	  return roster[x][y];
	}
  }
  // Return null if the coordinates are not found
  return null;
}

function setValueInRoster(roster, x, y, value) {
	// Check if the x coordinate exists in the roster
	if (!roster.hasOwnProperty(x)) {
		roster[x] = {};
	}

	roster[x][y] = value;
}

function mouseDown() {
	if (selected[0] != "gate") {
		pos = getMousePos(canvas); 	

		id = getValueFromRoster(data["map"], Math.floor(pos[0]), Math.floor(pos[1]));

		if (id != null) {

			if (isKeyPressed(17)) {
				
				data["objects"][id]["input"] = (data["objects"][id]["input"] + 1) % 3;

				draw();
				
			} else {
				let margin = 0.05;

				mouseX = pos[0] - Math.floor(pos[0]);

				blckSize = 1 - margin * 2;

				if (drawMode) {

					if (mouseX > 0.8 * blckSize + margin && mouseX < 1) {
						select("wire", id);
					} else {
						setValueInRoster(data["map"], data["objects"][id]["gx"], data["objects"][id]["gy"], null)

						select("gate", id);
					}

				} else {

					if (!isKeyPressed(16)) {
						select("wire", id);
					} else {
						setValueInRoster(data["map"], data["objects"][id]["gx"], data["objects"][id]["gy"], null)

						select("gate", id);
					}

				}
			}
			
			
		}

		
	}
}

function mouseUp() {
	pos = getMousePos(canvas); 
	
	if (pos[0] > gridSize.value || pos[0] < 0 || pos[1] > gridSize.value || pos[1] < 0) {
		if (selected[0] === "gate") {
			let id = selected[1];
			
			if (data["objects"][id]["gx"] != null) {
				setValueInRoster(data["map"], data["objects"][id]["gx"], data["objects"][id]["gy"], null)
			}
			
			deleteGate(selected[1]);

			select("remove", null);

			draw();
		}
	} else if (selected[0] === "gate") {
		let x = Math.floor(pos[0]);
		let y = Math.floor(pos[1]);

		let id = selected[1];

		let maybeDelete = getValueFromRoster(data["map"], x, y);
		
		if (maybeDelete != null) {
			deleteGate(maybeDelete);
		} 

		data["objects"][id]["x"] = x;
		data["objects"][id]["y"] = y;

		data["objects"][id]["gx"] = x;
		data["objects"][id]["gy"] = y;

		setValueInRoster(data["map"], x, y, id)

		select("remove", null);

		draw();
	} else if (selected[0] === "wire") {

		let x = Math.floor(pos[0]);
		let y = Math.floor(pos[1]);

		let id = selected[1];

		let connectToId = getValueFromRoster(data["map"], x, y);

		if (connectToId != null) {
			connectGates(id, connectToId);
		} 

		select("remove", null);

		draw();
		
	}
}

function mouseMove() {
	if (selected[0] === "gate") {
		
		data["objects"][selected[1]]["x"] = getMousePos(canvas)[0] - 0.5;

		data["objects"][selected[1]]["y"] = getMousePos(canvas)[1] - 0.5;

		draw();
		
	} else if (selected[0] === "wire") {
		
		draw();
		
	}
}

function exportToSM() {
	/* vertion 2 */

	var smJson = {
		"bodies": [
			{
				"childs": []
			}
		],
		"version": 4
	}

	sortedIDs = sortObjects(data["objects"]);

	inputOutputHeight = [0, 0, 0];

	for (let i = 0; i < sortedIDs.length; i += 1) {

		let item = data["objects"][sortedIDs[i]];

		if (item["controllers"].length === 0) {
			controllers = null;
		} else {
			controllers = [];

			for (let a = 0; a < item["controllers"].length; a += 1) {
				let id = item["controllers"][a];

				controllers.push({ "id": id })
			}
		}

		if (compact) {
			x = [0, -1, 1][item["input"]];
			y = inputOutputHeight[item["input"]];

			item["input"] === 0 ? inputOutputHeight[item["input"]] = 0 : inputOutputHeight[item["input"]] += 1;
		} else {
			x = item["gx"];
			y = item["gy"];
		}

		smJson["bodies"][0]["childs"].push({
			"color": ["DF7F01", "6098f7", "f76060"][item["input"]],
			"controller": {
				"active": false,
				"controllers": controllers,
				"id": Number(sortedIDs[i]),
				"joints": null,
				"mode": item["mode"]
			},
			"pos": {
				"x": x,
				"y": y,
				"z": 0
			},
			"shapeId": "9f0f56e8-2c31-4d83-996c-d00a9b296c3f",
			"xaxis": 1,
			"zaxis": -2
		});
	}

	/* vertion 2 */

	downloadJSON(smJson, "blueprint");
}

function isGateActive(object, id) {
	if (object["mode"] === "compact") {

		let index = object["controllers"].indexOf(parseInt(id));

		return object["active"][index];

	} else {
		return object["active"];
	}


}

function simulateStep() {
	for (let key in data["objects"]) {
		if (data["objects"].hasOwnProperty(key)) {
			let item = data["objects"][key];

			if (item["mode"] != "compact") {

				numberOfInputs = item["controlled"].length;

				activeInputs = 0;

				for (let i = 0; i < item["controlled"].length; i += 1) {
					let cId = item["controlled"][i];

					if (data["objects"].hasOwnProperty(cId)) {

						let item2 = data["objects"][cId];

						activeInputs += isGateActive(item2, key) ? 1 : 0;

					}

				}

				if (numberOfInputs > 0) {
					if (item["mode"] === 0) {
						on = numberOfInputs <= activeInputs;
					} else if (item["mode"] === 1) {
						on = activeInputs >= 1;
					} else if (item["mode"] === 2) {
						on = activeInputs % 2 === 1;
					} else if (item["mode"] === 3) {
						on = numberOfInputs <= activeInputs ? false : true;
					} else if (item["mode"] === 4) {
						on = activeInputs === 0;
					} else if (item["mode"] === 5) {
						on = activeInputs % 2 === 0;
					} else { let on = false; }
				} else {
					on = false;
				}

				data["objects"][key]["activeNew"] = on;

			} else {
				// compact gate

				inputs = [];

				for (let i = 0; i < item["controlled"].length; i += 1) {
					let cId = item["controlled"][i];

					if (data["objects"].hasOwnProperty(cId)) {

						let item2 = data["objects"][cId];

						inputs.push(isGateActive(item2, key));

					}

				}

				data["objects"][key]["activeNew"] = simulateStepInCompactGate(data["objects"][key]["internal"], inputs);
			}

			
			
		}
	}

	for (let key in data["objects"]) {
		if (data["objects"].hasOwnProperty(key)) {

			data["objects"][key]["active"] = data["objects"][key]["activeNew"];
			
		}
	}

	draw();
}

function simulateStepInCompactGate(compactGate, inputs) {
	sortedIDs = sortObjects(compactGate["data"]["objects"]);

	inputNUM = 0;

	for (let i = 0; i < sortedIDs.length; i += 1) {

		let item = compactGate["data"]["objects"][sortedIDs[i]];

		if (item["input"] === 1) {
			compactGate["data"]["objects"][sortedIDs[i]]["active"] = inputs[inputNUM];

			inputNUM += 1;
		}

	}

	for (let key in compactGate["data"]["objects"]) {
		if (compactGate["data"]["objects"].hasOwnProperty(key)) {
			let item = compactGate["data"]["objects"][key];

			numberOfInputs = item["controlled"].length;

			activeInputs = 0;

			for (let i = 0; i < item["controlled"].length; i += 1) {
				let cId = item["controlled"][i];

				if (compactGate["data"]["objects"].hasOwnProperty(cId)) {
					let item2 = compactGate["data"]["objects"][cId];

					activeInputs += item2["active"] ? 1 : 0;
				}

			}

			if (numberOfInputs > 0) {
				if (item["mode"] === 0) {
					on = numberOfInputs <= activeInputs;
				} else if (item["mode"] === 1) {
					on = activeInputs >= 1;
				} else if (item["mode"] === 2) {
					on = activeInputs % 2 === 1;
				} else if (item["mode"] === 3) {
					on = numberOfInputs <= activeInputs ? false : true;
				} else if (item["mode"] === 4) {
					on = activeInputs === 0;
				} else if (item["mode"] === 5) {
					on = activeInputs % 2 === 0;
				} else { let on = false; }
			} else {
				on = false;
			}

			compactGate["data"]["objects"][key]["activeNew"] = on;

		}
	}

	for (let key in compactGate["data"]["objects"]) {
		if (compactGate["data"]["objects"].hasOwnProperty(key)) {

			compactGate["data"]["objects"][key]["active"] = compactGate["data"]["objects"][key]["activeNew"];

		}
	}

	outputs = [];

	sortedIDs = sortObjects(compactGate["data"]["objects"]);

	outputNUM = 0;

	for (let i = 0; i < sortedIDs.length; i += 1) {

		let item = compactGate["data"]["objects"][sortedIDs[i]];

		if (item["input"] === 2) {

			outputs[outputNUM] = item["activeNew"];

			outputNUM += 1;

		}

	}

	return outputs;
}

function createCompactGate() {
	if (localStorage.getItem("compactGates") === null) {
		localStorage.setItem("compactGates", JSON.stringify([]));
	}

	compactGatesArray = JSON.parse(localStorage.getItem("compactGates"));

	inputs = [];
	outputs = [];

	sortedIDs = sortObjects(data["objects"]);

	for (let i = 0; i < sortedIDs.length; i += 1) {

		let item = data["objects"][sortedIDs[i]];

		if (item["input"] === 1) {
			inputs.push(sortedIDs[i]);
		} else if (item["input"] === 2) {
			outputs.push(sortedIDs[i]);
		}
	}

	compactGate = {
		"name": inputCompactName.value,
		"data": data,
		"inputs": inputs,
		"outputs": outputs
	}

	compactGatesArray.push(compactGate);

	localStorage.setItem("compactGates", JSON.stringify(compactGatesArray));

	data = {
		"objects": {
			
		}, "map": {
			
		}
	}
	
	init();
	draw();
}

function downloadJSON(object, fileName) {
	// Convert the JavaScript object to a JSON string
	const jsonString = JSON.stringify(object, null, 2);
	
	// Create a Blob with the JSON string
	const blob = new Blob([jsonString], { type: 'application/json' });
	
	// Create a download link
	const downloadLink = document.createElement('a');
	downloadLink.href = URL.createObjectURL(blob);
	downloadLink.download = fileName;
	
	// Append the link to the body
	document.body.appendChild(downloadLink);
	
	// Trigger the download
	downloadLink.click();
	
	// Remove the link from the DOM
	document.body.removeChild(downloadLink);

	// Tank you chatGPT!
	// I am lazy. 
	// Why am I puting this here?
	// Will anyone ever find this?
}

function drawArrow(ctx, fromx, fromy, tox, toy, arrowWidth, color){
	//variables to be used when creating the arrow
	var headlen = 10;
	var angle = Math.atan2(toy-fromy,tox-fromx);

	ctx.save();
	ctx.strokeStyle = color;

	//starting path of the arrow from the start square to the end square
	//and drawing the stroke
	ctx.beginPath();
	ctx.moveTo(fromx, fromy);
	ctx.lineTo(tox, toy);
	ctx.lineWidth = arrowWidth;
	ctx.stroke();

	//starting a new path from the head of the arrow to one of the sides of
	//the point
	ctx.beginPath();
	ctx.moveTo(tox, toy);
	ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
			   toy-headlen*Math.sin(angle-Math.PI/7));

	//path from the side point of the arrow, to the other side point
	ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),
			   toy-headlen*Math.sin(angle+Math.PI/7));

	//path from the side point back to the tip of the arrow, and then
	//again to the opposite side point
	ctx.lineTo(tox, toy);
	ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
			   toy-headlen*Math.sin(angle-Math.PI/7));

	//draws the paths created above
	ctx.stroke();
	ctx.restore();
}

function movePointTowards(point1, point2, distance) {
	// Extract coordinates of the two points
	let [x1, y1] = point1;
	let [x2, y2] = point2;

	// Calculate the displacement vector
	let deltaX = x2 - x1;
	let deltaY = y2 - y1;

	// Calculate the length of the vector
	let length = Math.sqrt(deltaX ** 2 + deltaY ** 2);

	// Normalize the vector (convert it to a unit vector)
	let normalizedDeltaX = deltaX / length;
	let normalizedDeltaY = deltaY / length;

	// Calculate the new point
	let newX = x1 + normalizedDeltaX * distance;
	let newY = y1 + normalizedDeltaY * distance;

	return [newX, newY];
}

function draw() {
	ctx.imageSmoothingEnabled = false;
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.fillStyle = "#e0e0e0";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	gridSquares = gridSize.value;

	const margin = canvas.height / gridSquares * 0.05;
	const sizeOfGrid = canvas.height / gridSquares;

	const blockSize = sizeOfGrid - margin * 2;

	ctx.fillStyle = "white";

	/*a = 0
	a += 4
	ctx.fillStyle = "rgb(" + a + "," + a + "," + a +")"*/
	
	for (let x = 0; x < gridSquares; x += 1) {
		for (let y = 0; y < gridSquares; y += 1) {			
			const drawX = x / gridSquares * canvas.width;
			const drawY = y / gridSquares * canvas.height;
			
			ctx.fillRect(drawX + margin, drawY + margin, sizeOfGrid - margin * 2, sizeOfGrid - margin * 2);
		}
	}

	if (drawMode) {
		for (let key in data["objects"]) {
			if (data["objects"].hasOwnProperty(key)) {
				let item = data["objects"][key];

				let drawX = item["x"] / gridSquares * canvas.width;
				let drawY = item["y"] / gridSquares * canvas.height;

				ctx.fillStyle = "#6098f7";
				ctx.fillRect(drawX + margin, drawY + margin, blockSize * 0.2, blockSize)

				ctx.lineWidth = margin/2;
				ctx.strokeStyle = "#000000";
				ctx.lineWidth = margin/2;
				ctx.strokeRect(drawX + margin, drawY + margin, blockSize * 0.2, blockSize)

				ctx.fillStyle = "#f76060";
				ctx.fillRect(drawX + margin + blockSize * 0.8, drawY + margin, blockSize * 0.2, blockSize)

				ctx.lineWidth = margin/2;
				ctx.strokeStyle = "#000000";
				ctx.lineWidth = margin/2;
				ctx.strokeRect(drawX + margin + blockSize * 0.8, drawY + margin, blockSize * 0.2, blockSize)

				ctx.lineWidth = margin/2;
				ctx.strokeStyle = "#000000";
				ctx.beginPath();
				ctx.arc(drawX + margin + blockSize * 0.1, drawY + margin + blockSize * 0.5, margin/2, 0, 2 * Math.PI);
				ctx.stroke();

				ctx.beginPath();
				ctx.arc(drawX + margin + blockSize * 0.9, drawY + margin + blockSize * 0.5, margin/2, 0, 2 * Math.PI);
				ctx.stroke();

				ctx.fillStyle = "black";
				ctx.font = sizeOfGrid * 0.2 + "px Arial";

				let text = modeToName[item["mode"]].toUpperCase();
				let textWidth = + ctx.measureText(text).width;

				ctx.fillText(text, drawX + margin + blockSize * 0.2 + ((blockSize * 0.6 - textWidth) / 2), drawY + margin + blockSize * 0.2);

				
				ctx.fillStyle = "black";
				ctx.font = sizeOfGrid * 0.2 + "px Arial";

				let inputText = ["", " IN", " OUT"][item["input"]];
				let inputTextWidth = + ctx.measureText(inputText).width;

				ctx.fillText(inputText, drawX + margin + blockSize * 0.2 + ((blockSize * 0.6 - inputTextWidth) / 2), drawY + margin + blockSize * 1);

				
				if (item["active"]) {
					ctx.fillStyle = "#0fbdf2";
				} else {
					ctx.fillStyle = "#083b6e";
				}

				ctx.fillRect(drawX + margin + blockSize * 0.2, drawY + margin + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6)

				ctx.drawImage(document.getElementById(modeToName[item["mode"]]), drawX + margin + blockSize * 0.2, drawY + margin + blockSize * 0.2, blockSize * 0.6, blockSize * 0.6);

				ctx.strokeStyle = "#000000";
				ctx.lineWidth = margin/2;
				ctx.strokeRect(drawX + margin, drawY + margin, blockSize, blockSize)
			}
		}
	} else {
		for (let key in data["objects"]) {
			if (data["objects"].hasOwnProperty(key)) {
				let item = data["objects"][key];

				let drawX = item["x"] / gridSquares * canvas.width;
				let drawY = item["y"] / gridSquares * canvas.height;

				if (item["mode"] === "compact") {

					ctx.fillStyle = ["#DF7F01", "#6098f7", "#f76060"][item["input"]]

					ctx.fillRect(drawX + margin, drawY + margin, blockSize, blockSize)

					ctx.font = sizeOfGrid * 0.2 + "px Arial";

					let text = item["internal"]["name"];

					let textWidth = + ctx.measureText(text).width;

					ctx.fillStyle = "white";
					ctx.fillRect(drawX + margin + blockSize / 2 - textWidth / 2 - blockSize*0.05, drawY + margin, textWidth + blockSize * 0.1, blockSize * 0.25)

					ctx.fillStyle = "black";
					ctx.fillText(text, drawX + margin + blockSize / 2 - textWidth / 2, drawY + margin + blockSize * 0.225);

				} else {
					ctx.fillStyle = ["#DF7F01", "#6098f7", "#f76060"][item["input"]]

					ctx.fillRect(drawX + margin, drawY + margin, blockSize, blockSize)

					if (item["active"]) {
						ctx.fillStyle = "#0fbdf2";
					} else {
						ctx.fillStyle = "#083b6e";
					}

					ctx.fillRect(drawX + margin + blockSize * 0.05, drawY + margin + blockSize * 0.05, blockSize * 0.9, blockSize * 0.9)

					ctx.drawImage(document.getElementById(modeToName[item["mode"]]), drawX + margin + blockSize * 0.05, drawY + margin + blockSize * 0.05, blockSize * 0.9, blockSize * 0.9);

					ctx.font = sizeOfGrid * 0.15 + "px Arial";

					let text = modeToName[item["mode"]].toUpperCase() + ["", " IN", " OUT"][item["input"]];

					let textWidth = + ctx.measureText(text).width;

					ctx.fillStyle = "white";
					ctx.fillRect(drawX + margin, drawY + margin, textWidth + blockSize * 0.05, blockSize * 0.175)

					ctx.fillStyle = "black";
					ctx.fillText(text, drawX + margin + blockSize * 0.025, drawY + margin + blockSize * 0.15);

					ctx.strokeStyle = "#000000";
					ctx.lineWidth = margin / 2;
					ctx.strokeRect(drawX + margin, drawY + margin, blockSize, blockSize)
				}

				
			}
		}
	}
	
	

	for (let key in data["objects"]) {
		if (data["objects"].hasOwnProperty(key)) {
			let item = data["objects"][key];

			let drawX = item["x"] / gridSquares * canvas.width;
			let drawY = item["y"] / gridSquares * canvas.height;

			if (drawMode) {
				if (item["active"]) {
					ctx.strokeStyle = "#ff4747";
				} else {
					ctx.strokeStyle = "#6e1f1f";
				}
	
				ctx.lineWidth = margin;
	
				for (let i = 0; i < item["controllers"].length; i += 1) {
					let cId = item["controllers"][i];
					
					let cX = data["objects"][cId]["x"] / gridSquares * canvas.width;
					let cY = data["objects"][cId]["y"] / gridSquares * canvas.height;
					
					ctx.beginPath();
					ctx.moveTo(drawX + margin + blockSize * 0.9, drawY + margin + blockSize * 0.5);
					ctx.lineTo(cX + margin + blockSize * 0.1, cY + margin + blockSize * 0.5);
					ctx.stroke();
				}
			} else {
				let gridSize = canvas.height / gridSquares;

				if (item["active"]) {
					color = "#ff4747";
				} else {
					color = "#6e1f1f";
				}

				for (let i = 0; i < item["controllers"].length; i += 1) {
					let cId = item["controllers"][i];

					let cX = data["objects"][cId]["x"] / gridSquares * canvas.width;
					let cY = data["objects"][cId]["y"] / gridSquares * canvas.height;

					aPos = movePointTowards([drawX, drawY], [cX, cY], blockSize*0.5);

					bPos = movePointTowards([cX, cY], [drawX, drawY], blockSize*0.5);

					drawArrow(ctx, aPos[0] + gridSize / 2, aPos[1] + gridSize / 2, bPos[0] + gridSize / 2, bPos[1] + gridSize / 2, margin, color);
				}

				
			}
			
			

			
		}
	}

	if (selected[0] === "wire") {
		
		let id = selected[1];

		let item = data["objects"][id];

		let x = data["objects"][id]["x"] / gridSquares * canvas.width;
		let y = data["objects"][id]["y"] / gridSquares * canvas.height;
		
		if (drawMode){

			if (item["active"]) {
				ctx.strokeStyle = "#ff4747";
			} else {
				ctx.strokeStyle = "#6e1f1f";
			}
			
			ctx.lineWidth = margin;

			pos = getMousePos(canvas);

			ctx.beginPath();
			ctx.moveTo(x + margin + blockSize * 0.9, y + margin + blockSize * 0.5);
			ctx.lineTo(pos[0] / gridSquares * canvas.width, pos[1] / gridSquares * canvas.height);
			ctx.stroke();
			
		} else {
			let gridSize = canvas.height / gridSquares;

			if (item["active"]) {
				color = "#ff4747";
			} else {
				color = "#6e1f1f";
			}
			
			pos = getMousePos(canvas)

			pos = [pos[0] / gridSquares * canvas.width, pos[1] / gridSquares * canvas.width]
			
			aPos = movePointTowards([x + gridSize / 2, y + gridSize / 2], pos, blockSize*0.5);

			drawArrow(ctx, aPos[0], aPos[1], pos[0], pos[1], margin, color);
		}
	}

	
}

let numberOfRegualarGates = 6;

function init() {
	// Loop through each child
	for (let i = 0; i < gates.children.length; i++) {
		const child = gates.children[i];
		
		child.addEventListener("mousedown", function(event) {
			gateUsed(i, 0);
		});
	}

	if (localStorage.getItem("compactGates") === null) {
		localStorage.setItem("compactGates", JSON.stringify([]));
	}

	compactGatesArray = JSON.parse(localStorage.getItem("compactGates"));

	while (compactGates.firstChild) {
		compactGates.removeChild(compactGates.firstChild);
	}

	for (let i = numberOfRegualarGates; i < compactGatesArray.length + numberOfRegualarGates; i++) {

		let gate = compactGatesArray[i - numberOfRegualarGates];

		let compactDiv = document.createElement("div");

		compactDiv.appendChild(document.createElement('p')).textContent = gate["name"];

		compactDiv.addEventListener("mousedown", function (event) {
			gateUsed(i, 1);
		});

		compactGates.appendChild(compactDiv);

	}

}

maximumToolWidth = 0.3;
minimumToolWidth = 0.2;
bodyMargin = 10;

window.addEventListener('resize', resize);

function ensureMinDigits(number, minDigits) {
	// Convert the number to binary
	let binaryString = (number >>> 0).toString(2);

	// Calculate the number of leading zeros needed
	let numLeadingZeros = minDigits - binaryString.length;

	// Add leading zeros if necessary
	if (numLeadingZeros > 0) {
		binaryString = '0'.repeat(numLeadingZeros) + binaryString;
	}

	return binaryString;
}

function generateRam(pos, keys, bits) {

	var inputBits = (keys-1).toString(2).length;
	
	//let inputBits = Math.ceil(Math.sqrt(keys));

	let x = pos[0];
	let y = pos[1];

	rx = 0;
	ry = 0;

	inputIds = [];
	
	for (let i = 0; i < inputBits; i += 1) {

		let id = createGate(0, [x + rx, y + ry], [x + rx, y + ry]);
		
		rx += 1;

		inputIds.push(id);
	}

	rx = 0;
	ry = 2;

	for (let i = 0; i < keys; i += 1) {

		inputKeyBitId = createGate(0, [x + inputBits, y + ry], [x + inputBits, y + ry]);

		bineryKey = ensureMinDigits(ry - 2, inputBits);
		
		for (let i2 = 0; i2 < inputBits; i2 += 1) {
			
			let mode = [3, 0][bineryKey[rx]];
	
			let id = createGate(mode, [x + rx, y + ry], [x + rx, y + ry]);
	
			connectGates(inputIds[rx], id);

			connectGates(id, inputKeyBitId);
			
			rx += 1;
		}

		rx = 0;

		//connectGates(inputIds[rx], id);

		ry += 1;
	}
	
	let bestId = findLowestAvailableKey(data["objects"]);

	
	
	Math.sqrt(2);
	
}

//generateRam([1, 1], 5, 8); 

function resize() {
	body.style.margin = bodyMargin;
	
	availableWidth = window.innerWidth - bodyMargin * 2;
	availableHeight = window.innerHeight - bodyMargin * 2;
	
	if (availableWidth > availableHeight) {
		if (availableHeight > availableWidth / (1 + minimumToolWidth)) {
			// not wide enough
			tools.width = availableHeight * minimumToolWidth;
			tools.style.marginLeft = 0 + "px";
			
			canvas.width = availableWidth - tools.width; 
			canvas.height = availableWidth - tools.width; 
			canvas.style.marginLeft = tools.width + "px";
			canvas.style.marginTop = 0 + "px";
		} else if (availableHeight < availableWidth / (1 + maximumToolWidth)) {
			// too wide
			
			tools.width = availableHeight * maximumToolWidth;

			const extraSpace = (availableWidth - availableHeight * (1 + maximumToolWidth)) / 2
			
			tools.style.marginLeft = extraSpace + "px";

			canvas.width = availableHeight; 
			canvas.height = availableHeight; 
			canvas.style.marginLeft = tools.width + extraSpace + "px";
			canvas.style.marginTop = 0 + "px";
		} else {
			// wide (good)

			tools.width = availableWidth - availableHeight;
			tools.style.marginLeft = 0 + "px";

			canvas.width = availableHeight; 
			canvas.height = availableHeight; 
			canvas.style.marginLeft = tools.width + "px";
			canvas.style.marginTop = 0 + "px";
		}

		//sorry I was lazy and new to this
		tools.style.width = tools.width + "px";
		tools.style.height = availableHeight + "px";
		
	} else {
		// square
		canvas.width = window.innerHeight; 
		canvas.height = window.innerHeight; 
		canvas.style.marginLeft = 0 + "px";
		canvas.style.marginTop = 0 + "px";
	}
	
	draw();
};

//Get Mouse Position
function getMousePos(canvas) {
	var rect = canvas.getBoundingClientRect();
	
	return [(mousePos[0] - rect.left) / canvas.width * gridSize.value, (mousePos[1] - rect.top) / canvas.height * gridSize.value]
}

mousePos = [0,0];

window.addEventListener('mousemove', (event) => {
	mousePos = [(event.clientX), (event.clientY)];

	mouseMove();
});

var pressedKeys = {};

window.addEventListener("keydown", function (event) {
	pressedKeys[event.keyCode] = true;

	if (event.keyCode === 83) {simulateStep();} // s === 83
});

window.addEventListener("keyup", function (event) {
	pressedKeys[event.keyCode] = false;
});

function isKeyPressed(keyCode) {
	if (pressedKeys.hasOwnProperty(keyCode)) {
		return pressedKeys[keyCode];
	} else {
		return false;
	}
}

/* ------------------------------ ANIMATION LOGIC ------------------------------ */
			
// Function to start the animation loop
function startAnimation() {
  if (!isAnimating) {
	isAnimating = true;
	animate();
  }
}

// Function to stop the animation loop
function stopAnimation() {
  if (isAnimating) {
	isAnimating = false;
	cancelAnimationFrame(animationFrameId);
  }
}

// Function to adjust the TPS live
function setTargetTPS(newTPS) {
  targetTPS = newTPS;
  tickInterval = 1000 / targetTPS;
}

// animation loop
function animate(timestamp) {
  const elapsed = timestamp - lastTimestamp;

  if (elapsed > tickInterval) {
	lastTimestamp = timestamp;

	// animation logic stuff
	simulateStep();

  }

  if (isAnimating) {
	animationFrameId = requestAnimationFrame(animate);
  }
}
			
init();

resize();