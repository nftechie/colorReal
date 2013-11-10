/*
 *      Copyright 2013  Samsung Electronics Co., Ltd
 *
 *      Licensed under the Flora License, Version 1.1 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *              http://floralicense.org/license/
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

/*jslint devel: true*/
/*global $, Audio, window, localStorage, tizen, canvas, SystemIO, document, navigator, clearInterval, setInterval, setTimeout */
var selfCamera;
function SelfCamera() {
	"use strict";
}

function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}

(function () {
	"use strict";
	var DELAY_2_SECOND = 2, DELAY_5_SECOND = 5, DELAY_10_SECOND = 10;
	SelfCamera.prototype = {
		countdown: 0, // current value after clicking the camera button
		countdownIntervalID: -1,
		countSound: new Audio('sounds/sounds_count.wav'),
		img: document.createElement('canvas'),
		filename: '',
		loadDirectory: '',
		saveDirectory: 'images/',
		IMG_PREFIX: 'selfcam_widget_',
		sequence: 1,
		shutterSound: new Audio('sounds/sounds_Shutter_01.wav'),
		timer: null, // value set by the buttons
		systemIO: null,
		video: null,
		src: null
	};

	SelfCamera.prototype.setTimer = function setTimer(value) {
		this.timer = value;
		$('#timer2, #timer5, #timer10').removeClass('selected');
		$('#timer' + value).addClass('selected');
		selfCamera.video.play();
	};

	SelfCamera.prototype.refreshPhoto = function (fileHandle, onSuccess, onError) {
		var filePath = fileHandle.toURI().replace('file://', '');
		if (typeof (onSuccess) !== 'function') {
			onSuccess = function () {};
		}
		if (typeof (onError) !== 'function'){
			onError = function () {};
		}
		tizen.content.scanFile(filePath, onSuccess, onError);
	};

	SelfCamera.prototype.onCaptureVideoSuccess = function onCaptureVideoSuccess(stream) {
		var urlStream;
		this.createVideoElement();
		this.setTimer(DELAY_2_SECOND);
		urlStream = window.webkitURL.createObjectURL(stream);
		this.video.addEventListener('load', function () {
			$(this).video.play();
		}, false);
		this.src = this.video.src = urlStream;
		this.centerPreview();
	};

	SelfCamera.prototype.createVideoElement = function (src) {
		this.video = $('<video/>', {
			autoplay: 'autoplay',
			id: 'background',
			src: src
		}).appendTo("#center").get(0);
	};

	SelfCamera.prototype.onCaptureVideoError = function onCaptureVideoError(e) {
		console.error(e);
	};

	SelfCamera.prototype.startPreview = function startPreview() {
		var options = {
			audio: true,
			video: true
		};

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
		try {
			if (typeof (navigator.getUserMedia) === 'function') {
				navigator.getUserMedia(options, this.onCaptureVideoSuccess.bind(this), this.onCaptureVideoError.bind(this));
			}
		} catch (e) {
			alert('navigator.getUserMedia() error.');
			console.error('navigator.getUserMedia() error: ' + e.message);
		}

	};

	SelfCamera.prototype.increaseSequence = function increaseSequence() {
		var seq, str;
		function fillStr(num) {
			num = num.toString();
			if (num.length < 2) {
				num = '00' + num;
			} else if (num.length < 3) {
				num = '0' + num;
			}
			return num;
		}

		if (this.sequence) {
			seq = (parseInt(this.sequence, 10) + 1) % 1000;
			str = fillStr(seq);
		} else {
			seq = 1;
			str = '001';
		}

		this.sequence = str;
	};

	SelfCamera.prototype.loadThumbnail = function loadThumbnail() {
		var regexp = new RegExp('^' + this.saveDirectory), file;
		if (this.filename) {
			file = this.loadDirectory + this.filename.replace(regexp, '') +'?r=' + Math.random();
			$('<img/>').attr('src', file).load(function() {
				   $('#upImage').css('background-image', 'url(' + file + ')');
				});
			$('#thumbnail').css('background-image', 'url("./images/transparent.png")');
		}
	};

	SelfCamera.prototype.onFileExistsCheck = function (exists) {
		if (!exists) {
			this.setLastPhoto();
		}
	};

	SelfCamera.prototype.launchPreview = function launchPreview() {
		var service, onReply, self = this;
		if (this.filename === '') {
			return false;
		}

		function fillStr(num) {
			num = num.toString();
			if (num.length < 2) {
				num = '00' + num;
			} else if (num.length < 3) {
				num = '0' + num;
			}
			return num;
		}

		this.showPhotoPreview(this.loadDirectory + this.filename);
		return true;
	};

	SelfCamera.prototype.showGallery = function showGallery(service) {
		var onReply, self = this;
		onReply = {
			onsuccess: function (data) {
				self.showPhotoPreview(data[0].value[0]);
			},
			onfailure: function () {}
		};

		try {
			tizen.application.launchAppControl(service, null, function () {
			}, function (err) {
				console.error('Gallery launch failed: ' + err.message);
			}, onReply);
		} catch (exc) {
			alert('Exception: ' + exc.message);
		}
	};

	SelfCamera.prototype.showPhotoPreview = function showPhotoPreview(file) {
		var service, onReply, self = this;
		service = new tizen.ApplicationControl('http://tizen.org/appcontrol/operation/view', file, "image/*");
		onReply = {onsuccess: function () {}, onfailure: function () {}};

		try {
			tizen.application.launchAppControl(service, null, function () {}, function (err) {
				console.error('Photo launch failed: ' + err.message);
			}, onReply);
		} catch (exc) {
			alert('Exception: ' + exc.message);
		}
	};

	SelfCamera.prototype.setLoadDirectory = function setLoadDirectory(dirName) {
		this.loadDirectory = dirName;
		if (!this.loadDirectory.match(/\/$/)) {
			this.loadDirectory += '/';
		}
	};

	//LOOK AT ME
	SelfCamera.prototype.saveCanvas = function saveCanvas(canvas, fileName) {
		var data, onSuccess = function (fileHandle) {
			this.setLoadDirectory(fileHandle.parent.toURI());
			this.loadThumbnail();
			this.refreshPhoto(fileHandle);
		}.bind(this);

		try {
			data = canvas.toDataURL().replace('data:image/png;base64,', '').replace('data:,', '');
			if (data === '') {
				throw {message: "No image source"};
			}
		} catch (e) {
			this.filename = '';
			console.error('canvas.toDataUrl error: ' + e.message);
			alert("Data source error: " + e.message);
			return;
		}

		try {
			this.systemIO.deleteNode(fileName, function () {
				try {
					this.systemIO.saveFileContent(fileName, data, onSuccess, 'base64');
				} catch (e) {
					console.error('saveDataToFile error: ' + e.message);
				}
			}.bind(this));
		} catch (e2) {
			console.error('Delete old file error: ' + e2.message);
		}
	};

	SelfCamera.prototype.captureImage = function captureImage(video, e) {
//		this.img.width = video.videoWidth;
//		this.img.height = video.videoHeight;
//		video.width = screen.width;
//		video.height = screen.height;
//		this.img.width = screen.width;
//		this.img.height = screen.height;
		var c = this.img.getContext('2d');
		c.drawImage(video, 0, 0, screen.width, screen.height);
		
//		console.log(screen.width);
//		console.log(screen.height);
		
		//var pos = findPos($("canvas"));
	    var x = e.pageX;
	    var y = e.pageY;
	    var coord = "x=" + x + ", y=" + y;
	    //var c = this.img.getContext('2d');
	    var p = c.getImageData(x, y, 1, 1).data;
	    var rgb = "(RGB):" + p[0] + ", " + p[1] + ", " + p[2]; 
	    var hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);
	    alert("x: " + x + ", y: " + y + "\n" + hex + "\n" + rgb);
	    //$('#status').html(coord + "<br>" + hex + "<br>" + rgb);
	};

	SelfCamera.prototype.getSequenceFromFile = function getSequenceFromFile() {
		var regexp = new RegExp('[^0-9]+', 'gm');
		if (this.filename) {
			this.sequence = parseInt(this.filename.replace(regexp, ''), 10);
			if (isNaN(this.sequence)) {
				this.sequence = 0;
			}
		}
	};

	SelfCamera.prototype.setFileName = function setFileName(filename) {
		this.filename = filename;
		this.getSequenceFromFile();
		this.loadThumbnail();
	};

	SelfCamera.prototype.takePhoto = function takePhoto(e) {
		this.increaseSequence();
		this.filename = 'selfcam_widget_' + this.sequence + '.png';

		this.captureImage(this.video, e);
		this.savePhoto();
	};

	SelfCamera.prototype.savePhoto = function savePhoto() {
		this.saveCanvas(this.img, this.saveDirectory + this.filename);
		$('#thumbnail').show();
	};

	SelfCamera.prototype.findLastPhoto = function findLastPhoto(onFind) {
		function onDir(files) {
			if (files && files.length > 0) {
				files = files.sort(function (a, b) {
					return (a.created === b.created) ? 0 : (a.created < b.created ? -1 : 1);
				});
				onFind(files.pop());
			} else {
				onFind(null);
			}
		}

		function onError(e) {
			console.error('systemIO.dir error: ' + e.message);
		}

		this.systemIO.dir(this.saveDirectory, onDir, onError, null);
	};

	SelfCamera.prototype.onCountdownInterval = function onCountdownInterval() {
		if ((this.countdown -= 1) < 1) {
			clearInterval(this.countdownIntervalID);
			this.countdownIntervalID = -1;
			$('#countdown').text('').hide();
			$('#countdown').hide();
			this.shutterSound.play();
			this.takePhoto();
			this.bindTimerClicks();
		} else {
			$('#countdown').text(this.countdown);
			this.countSound.currentTime = 0;
			this.countSound.play();
		}
	};

	SelfCamera.prototype.startCountdown = function startCountdown(ev, startValue) {
		$("#thumbnail").hide();
		$(".timers div").off("click");
		if (this.countdownIntervalID > 0) {
			clearInterval(this.countdownIntervalID);
			this.countdownIntervalID = -1;
		}
		this.countdown = startValue || this.timer;
		this.countdownIntervalID = setInterval(this.onCountdownInterval.bind(this), 1000);
		$('#countdown').show().text(this.countdown);
		this.countSound.play();
	};

	SelfCamera.prototype.bindEvents = function bindEvents() {
		var self = this;

		document.addEventListener('webkitvisibilitychange', function (event) {
			clearInterval(self.countdownIntervalID);
			if (self.video !== null) {
				if (document.webkitVisibilityState === 'visible') {
					self.createVideoElement(self.src);
					setTimeout(function () { self.video.play(); }, 200);
					self.systemIO.fileExists(self.filename, self.onFileExistsCheck.bind(self));
					if (self.countdown > 0) {
						self.startCountdown(event, self.countdown);
					}
				} else {
					self.video.parentNode.removeChild(self.video);
				}
			}
		});

		$('shutter').mousedown(function (ev) {
			$('shutter').addClass('active');
		}).mouseup(function (ev) {
			$('shutter').removeClass('active');
		}).on('touchstart', function (ev) {
			$('shutter').addClass('active');
		}).on('touchend', function (ev) {
			$('shutter').removeClass('active');
		});

		$('#exit').on('click', function () {
			var app = tizen.application.getCurrentApplication();
			app.exit();
		});

		this.bindTimerClicks();

		$('#thumbnail').on('click', this.launchPreview.bind(this));
		$('#shutter').on('touchstart', this.startCountdown.bind(this));

		$('#background').on('click', function () { this.play(); });
		
		var tmpThis = this;
		
		$(document).on("click", function(e){
//			this.img.width = this.video.videoWidth;
//			this.img.height = this.video.videoHeight;
//			this.img.getContext('2d').drawImage(video, 0, 0);
			tmpThis.takePhoto(e);
		});
	};

	SelfCamera.prototype.bindTimerClicks = function bindTimerClicks() {
		$('#timer2').on('click', this.setTimer.bind(this, DELAY_2_SECOND));
		$('#timer5').on('click', this.setTimer.bind(this, DELAY_5_SECOND));
		$('#timer10').on('click', this.setTimer.bind(this, DELAY_10_SECOND));
	};

	SelfCamera.prototype.centerPreview = function () {
		$('#center').width($('#background').width());
		$('#center').css('margin-left', '-'+($('#background').width()/2)+'px');
	};

	SelfCamera.prototype.setLastPhoto = function () {
		this.findLastPhoto(function (file) {
			if (file) {
				this.setLoadDirectory(file.parent.toURI());
				this.setFileName(file.name);
				$('#thumbnail').css('background-image', 'url("./images/transparent.png")');
				$('#thumbnail').show();
			} else {
				$('#thumbnail').hide();
				$('#upImage').css('background-image', '');
				this.filename = '';
			}
		}.bind(this));
	};

	SelfCamera.prototype.getSaveDirectory = function (callback) {
		var tempFilters = [], abstractFilter, self = this, dir;
		tempFilters.push(new tizen.AttributeFilter('contentURI', 'STARTSWITH', '/opt/usr/media/'));
		tempFilters.push(new tizen.AttributeFilter('type', 'EXACTLY', 'IMAGE'));

		abstractFilter = new tizen.CompositeFilter("INTERSECTION", tempFilters);

		tizen.content.find(function (images) {
			if (images.length !== 0) {
				dir = images[0].contentURI.split('/');
				dir.pop();
				self.saveDirectory = dir.join('/') + '/';
			}
			callback(self);
		}, function (){}, null, abstractFilter);
	};

	SelfCamera.prototype.init = function init() {
		this.getSaveDirectory(function (that) {
			that.systemIO = new SystemIO();
			that.setLastPhoto();
			that.startPreview();
			that.bindEvents();
		});
	};

}());

selfCamera = new SelfCamera();
$(document).ready(function () {
	"use strict";
	selfCamera.init();
});
