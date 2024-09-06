//jshint esversion :6

const isDevMode = false;

var globalConfig = {
	websockTargetHost: isDevMode ? '172.16.114.50' : 'lit-savannah-10079-952437008f2e.herokuapp.com',
	websockTargetPort: isDevMode ? 9000 : 80
}

var myUniqID = null;

window.addEventListener("load", function () {
	myUniqID = localStorage.getItem('sessionID');

	if (!myUniqID) {
		myUniqID = uuidv4();
		localStorage.setItem('sessionID', myUniqID);
	}

	var canvas = document.getElementById('myCanvas');
	if (isDevMode === false) {
		var ws = new Ws(globalConfig.websockTargetHost, globalConfig.websockTargetPort, myUniqID);
		Event = new Event();

		Event.subscribe('ball.send', function (data) {
			ws.send(this.name, data);
		});
		var ball = new Ball(canvas, canvas.getContext("2d"));
	} else {
		var ball = new Ball(canvas, canvas.getContext("2d"));
		ball.getBall(250, 250, 0, 0);
	}
});

class Ws {
	constructor(address, port, uuid) {
		this.init(address, port, uuid);
	}

	init(address, port, uuid) {
		this.socket = new WebSocket('ws://' + address + ':' + port + '?uuid=' + uuid);

		this.socket.onopen = function (e) {
			console.log("CONNECTION OPEN");
			let statusEl = document.getElementById('active_status');
			if (statusEl.classList.contains('red')) {
				statusEl.classList.remove('red')
			}
			statusEl.classList.add('green');
		};

		this.socket.onmessage = function (e) {
			var data = JSON.parse(e.data);
			console.log(data);
			Event.call(data.type, data.data);
		};

		this.socket.onclose = function (e) {
			console.log("CONNECTION CLOSED");
			let statusEl = document.getElementById('active_status');
			if (statusEl.classList.contains('green')) {
				statusEl.classList.remove('green')
			}
			statusEl.classList.add('red');
		}

		this.socket.onerror = function (e) {
		};
	}

	send(name, values) {
		this.socket.send(JSON.stringify({ 'type': name, 'data': values }));
	}
};

class Event {
	constructor() {
		this.events = {};
	}
	subscribe(name, callback) {
		this.name = name;
		if (!this.events[name]) {
			this.events[name] = new Array();
		}
		this.events[name].push(callback);
	}
	unsubscribe(name, callback) {
		this.name = name;
		this.events[name].splice(this.events[name].indexOf(callback), 1);
	}
	call(name) {
		this.name = name;
		if (this.events[name]) {
			for (var i = 0; i < this.events[name].length; i++) {
				this.events[name][i].apply(this, Array.prototype.slice.call(arguments, 1));
			}
		}
	}
};

class Ball {
	constructor(canvas, context) {
		this.canvas = canvas;
		this.context = context;
		var self = this;

		// class members
		this.controlBall = false;
		this.x = 0;
		this.y = 0;
		this.speedX = 0;
		this.speedY = 0;
		this.radius = 25;
		this.friction = 0.95;

		this.lastMouseX = 0;
		this.lastMouseY = 0;
		this.throwingBall = false;

		this.trailMaxSize = 20;
		this.trail = new Array();

		// do reshape
		this.reshape();
		// start!
		this.start();

		if (isDevMode === false) {
			this.bind();
		}
	}
	reshape() {
		var self = this;

		// on resize event
		window.onresize = function (e) {
			self.reshape();
		};

		// Canvas Styles
		if (this.canvas) {
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight;
			this.context.fillStyle = "#000000";
			this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}
	start() {
		var self = this;
		var fps = 30;

		// on mouse down event
		document.onmousedown = function (e) {
			if (self.controlBall) {
				self.throwingBall = true;
				self.lastMouseX = e.clientX;
				self.lastMouseY = e.clientY;
			}
		};

		// on mouse up event
		document.onmouseup = function (e) {
			if (self.controlBall) {
				self.throwingBall = false;
			}
		};

		// on mouse move event
		document.onmousemove = function (e) {
			if (self.controlBall && self.throwingBall) {
				var offsetX = e.clientX - self.lastMouseX;
				var offsetY = e.clientY - self.lastMouseY;

				self.speedX += offsetX / 5;
				self.speedY += offsetY / 5;

				self.lastMouseX = e.clientX;
				self.lastMouseY = e.clientY;
			}
		};

		// set up timer to render screen
		setInterval(function () {
			self.render();
		}, 1000 / fps);
	}
	// called when this client receives control of the ball
	getBall(posX, posY, speedX, speedY) {
		this.controlBall = true;
		this.x = posX;
		this.y = posY;
		this.speedX = speedX;
		this.speedY = speedY;

		// create fake trail
		for (var i = this.trailMaxSize - 1; i >= 0; i--) {
			var trailX = this.x - this.speedX * i;
			var trailY = this.y - this.speedY * i;

			this.trail.push([trailX, trailY]);
		}
	}
	// called to release the control of the ball from this client
	dropBall() {
		this.controlBall = false;
		this.lastMouseX = 0;
		this.lastMouseY = 0;
		this.throwingBall = false;
	}
	// Screen status
	showScreenStatus(screen) {
		document.getElementById('current_screen_num').innerText = screen;
	}
	render() {

		// erase trail
		for (var i = 0; i < this.trail.length; i++) {
			this.context.fillStyle = "#000000";
			this.context.beginPath();
			this.context.arc(this.trail[i][0], this.trail[i][1], this.radius + 1, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.fill();
		}

		// if this client isn't controlling the ball anymore remove the first trail element
		if (!this.controlBall && this.trail.length > 0)
			this.trail.shift();

		// while tail has more elements than trailMaxSize remove the first one
		while (this.trail.length > this.trailMaxSize)
			this.trail.shift();

		// erase ball
		if (this.controlBall) {
			this.context.fillStyle = "#000000";
			this.context.beginPath();
			this.context.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.fill();
		}

		// update ball physics if this client has control of the ball
		if (this.controlBall) {
			// update speed
			this.speedX *= this.friction;
			this.speedY *= this.friction;

			// update position according to speed
			this.x += this.speedX;
			this.y += this.speedY;

			// if ball cross screen edges of this client (left or right) send a message to server
			if (isDevMode === false && this.controlBall && (this.x < -this.radius || this.x > this.canvas.width + this.radius)) {
				if (this.x < -this.radius) {
					var values = [0, this.y, this.speedX, this.speedY, myUniqID];
				} else {
					var values = [1, this.y, this.speedX, this.speedY, myUniqID];
				}

				this.dropBall();

				Event.call('ball.send', values);
			}

			if (isDevMode === true) {
				// create bounce effect on x-axis
				if (this.x - this.radius < 0 || this.x + this.radius > this.canvas.width) {
					if (this.x - this.radius < 0) {
						this.x = this.radius;
					} else if (this.x + this.radius > this.canvas.width) {
						this.x = this.canvas.width - this.radius;
					}

					this.speedX *= -1;
				}
			}
			// create bounce effect on Y axis
			if (this.y - this.radius < 0 || this.y + this.radius > this.canvas.height) {
				if (this.y - this.radius < 0) {
					this.y = this.radius;
				} else if (this.y + this.radius > this.canvas.height) {
					this.y = this.canvas.height - this.radius;
				}

				this.speedY *= -1;
			}

			// if speed is too small set it to zero
			// (avoid values next to zero)
			if (Math.abs(this.speedX) < 0.01) {
				this.speedX = 0;
			}
			if (Math.abs(this.speedY) < 0.01) {
				this.speedY = 0;
			}
		}

		// draw trail
		for (var i = 0; i < this.trail.length; i++) {
			this.context.fillStyle = "#" + (Math.round((i / this.trailMaxSize) * 0xff)).toString(16) + "0000";
			this.context.beginPath();
			this.context.arc(this.trail[i][0], this.trail[i][1], this.radius, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.fill();
		}

		// draw ball
		if (this.controlBall) {
			this.trail.push([this.x, this.y]);

			this.context.fillStyle = "#ff0000";
			this.context.beginPath();
			this.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
			this.context.closePath();
			this.context.fill();
		}
	}
	bind() {
		var self = this;

		//on receive ball
		Event.subscribe('ball.get', function (data) {
			if (data[0] == 0) {
				self.getBall(window.innerWidth, data[1], data[2], data[3]);
			} else {
				self.getBall(0, data[1], data[2], data[3]);
			}
		});
		//on receive online
		Event.subscribe('online', function (data) {
			if (data == 1) {
				self.getBall(250, 250, 0, 0);
			}
		});
		// withBall
		Event.subscribe('withBall', function (data) {
			console.log('with ball screen', data);
			self.showScreenStatus(data);
		});
		// screen Number
		Event.subscribe('screenNumber', function (data) {
			console.log('screen number', data)
			document.getElementById('user_screen_num').innerHTML = data
		});

		// screen Number
		Event.subscribe('rostersize', function (data) {
			console.log('rostersize', data)
			document.getElementById('rosterCount').innerHTML = `Friends: ${data}`
		});
	}
};

function uuidv4() {
	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}
