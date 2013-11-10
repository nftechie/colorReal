/*jslint devel: true*/
/*global tizen, $, app, localStorage */

/**
 * @class SystemIO
 */
function SystemIO() {
	'use strict';
}

(function () { // strict mode wrapper
	'use strict';
	SystemIO.prototype = {
		/**
		 * Creates new empty file in specified location
		 * 
		 * @param {File} directoryHandle
		 * @param {string} fileName
		 */
		createFile: function SystemIO_createFile(directoryHandle, fileName) {

			try {
				return directoryHandle.createFile(fileName);
			} catch (e) {
				console.error('SystemIO_createFile error: ' + e.message);
				return false;
			}
		},

		/**
		 * Writes content to file stream
		 * 
		 * @param {File} file handler
		 * @param {string} file content
		 * @param {function} on success callback with one argument {File} fileHandle
		 * @param {string} content encoding
		 */
		writeFile: function SystemIO_writeFile(fileHandle, fileContent, onSuccess, onError, contentEncoding) {
			onError = onError || function () {};

			fileHandle.openStream('w', function (fileStream) {
				if (contentEncoding === 'base64') {
					fileStream.writeBase64(fileContent);
				} else {
					fileStream.write(fileContent);
				}

				fileStream.close();

				// launch onSuccess callback
				if (typeof onSuccess === 'function') {
					onSuccess(fileHandle);
				}
			}, onError, 'UTF-8');
		},

		/**
		 * Opens specified location
		 * 
		 * @param {string} directory path
		 * @param {function} on success callback
		 * @param {function} on error callback
		 * @param {string} mode
		 */
		openDir: function SystemIO_openDir(directoryPath, onSuccess, onError, openMode) {
			openMode = openMode || 'rw';
			onSuccess = onSuccess || function () {};
			onError = onError || function () {};

			try {
				tizen.filesystem.resolve(directoryPath, onSuccess, onError, openMode);
			} catch (e) {
				console.error('SystemIO_openDir error:' + e.message);
			}
		},

		/**
		 * Get list of files
		 * 
		 * @param {string} directoryPath directory path
		 * @param {function} onSuccess on success callback
		 * @param {function} onError on error callback
		 * @param {string} fileMask
		 */
		dir: function SystemIO_dir(directoryPath, onSuccess, onError, fileMask) {
			fileMask = fileMask || '';
			onSuccess = onSuccess || function () {};

			function onOpenDir(dir) {
				var filter = null;
				if (typeof dir === 'undefined') {
					throw {message: 'dir is not object'};
				}
				if (!dir.toString().match('File')) {
					throw {message: 'dir is not instance of File'};
				}
				fileMask = (typeof fileMask === 'string') ? {name: fileMask} : fileMask;
				filter = fileMask || null;
				dir.listFiles(onSuccess, onError, filter);
			}

			function onOpenDirError(e) {
				console.error('onOpenDirError: ' + e.message);
			}

			try {
				this.openDir(directoryPath, onOpenDir, onOpenDirError, 'r');
			} catch (e) {
				console.error('SystemIO_dir error:' + e.message);
			}
		},

		/**
		 * Parse specified filepath and returns data parts
		 * 
		 * @param {string} filePath
		 * @returnss {array}
		 */
		getPathData: function SystemIO_getPathData(filePath) {
			var path = {
				originalPath: filePath,
				fileName: '',
				dirName: ''
			},
				splittedPath = filePath.split('/');

			path.fileName = splittedPath.pop();
			path.dirName = splittedPath.join('/') || '/';

			return path;
		},

		/**
		 * Save specified content to file
		 * 
		 * @param {string} file path
		 * @param {string} file content
		 * @param {string} file encoding
		 */
		saveFileContent: function SystemIO_saveFileContent(filePath, fileContent, onSaveSuccess, fileEncoding) {
			var pathData = this.getPathData(filePath),
				self = this,
				fileHandle;

			function onOpenDirSuccess(dir) {
				// create new file
				fileHandle = self.createFile(dir, pathData.fileName);
				if (fileHandle !== false) {
					// save data into this file
					self.writeFile(fileHandle, fileContent, onSaveSuccess, false, fileEncoding);
				}
			}

			// open directory
			this.openDir(pathData.dirName, onOpenDirSuccess);
		},

		/**
		 * Deletes node with specified path
		 * 
		 * @param {string} node path
		 * @param {function} success callback
		 */
		deleteNode: function SystemIO_deleteNode(nodePath, onSuccess) {
			var pathData = this.getPathData(nodePath),
				self = this;

			function onDeleteSuccess() {
				onSuccess();
			}

			function onDeleteError(e) {
				console.error('SystemIO_deleteNode:_onDeleteError', e);
			}

			function onOpenDirSuccess(dir) {
				var onListFiles = function (files) {
					if (files.length > 0) {
						// file exists;
						if (files[0].isDirectory) {
							self.deleteDir(dir, files[0].fullPath, onDeleteSuccess, onDeleteError);
						} else {
							self.deleteFile(dir, files[0].fullPath, onDeleteSuccess, onDeleteError);
						}
					} else {
						onDeleteSuccess();
					}
				};

				// check file exists;
				dir.listFiles(onListFiles, function (e) {
					console.error(e);
				}, {
					name: pathData.fileName
				});
			}

			this.openDir(pathData.dirName, onOpenDirSuccess, function (e) {
				console.error('openDir error:' + e.message);
			});
		},

		/**
		 * Deletes specified file
		 * 
		 * @param {File} dir
		 * @param {string} filePath file path
		 * @param {function} onDeleteSuccess delete success callback
		 * @param {function} onDeleteError delete error callback
		 */
		deleteFile: function SystemIO_deleteFile(dir, filePath, onDeleteSuccess, onDeleteError) {
			try {
				dir.deleteFile(filePath, onDeleteSuccess, onDeleteError);
			} catch (e) {
				console.error('SystemIO_deleteFile error:' + e.message);
				return false;
			}
		},

		/**
		 * Deletes specified directory
		 * 
		 * @param {File} dir
		 * @param {string} dir path
		 * @param {function} delete success callback
		 * @param {function} delete error callback
		 * @returns {boolean}
		 */
		deleteDir: function SystemIO_deleteDir(dir, dirPath, onDeleteSuccess, onDeleteError) {
			try {
				dir.deleteDirectory(dirPath, false, onDeleteSuccess, onDeleteError);
			} catch (e) {
				console.error('SystemIO_deleteDir error:' + e.message);
				return false;
			}

			return true;
		},

		/**
		 * The method check the file exists;
		 * @param {string} filePath
		 * @param {function} onCheck success callback
		 * @returns {undefined}
		 */
		fileExists: function SystemIO_fileExists(filePath, onCheck) {
			var pathData = this.getPathData(filePath);

			function onOpenDirSuccess(dir) {
				try {
					dir.resolve(pathData.fileName);
					onCheck(true);
				} catch (error) {
					onCheck(false);
				}
			}

			// if directory not exists, the file also not exists;
			function onOpenDirError(error) {
				onCheck(false);
			}

			// open directory
			this.openDir(pathData.dirName, onOpenDirSuccess, onOpenDirError);
		}
	};
}());