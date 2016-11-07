'use strict';

const config = require('../../config/env');
const cmd = require('node-cmd');


function gitGet(req, res) {
	var url = '', foldername = '';
	if (req.query.url) {
		url = 'https://github.com/' + decodeURI(req.query.url);
		foldername = decodeURI(req.query.url).split('/')[1];
	}
	cmd.get(
		`
		cd git
		git clone ${url}
		cd ${foldername}
		git ls-files | while read f; do git blame --line-porcelain $f | grep '^author '; done | sort -f | uniq -ic | sort -n
		`,
		function(data) {
			var dataArr = data.split('\n');
			var responseArr = [];
			for (var i = 0; i < dataArr.length; i++) {
				if (dataArr[i].includes('Binary')) {
					// do nothing
				} else {
					responseArr.push(dataArr[i].trim());
				}
			}
			return res.json({
				'res': responseArr
			});
		}
);
}

function gitBlame(req, res) {
	if (req.query.url && req.query.folderPath && req.query.file) {
		var url = 'https://github.com/' + decodeURI(req.query.url);
		var filePath = decodeURI(req.query.file);
		var folderPath = decodeURI(req.query.folderPath);
	}
	cmd.get(
		`
		cd git
		git clone ${url}
		cd ${folderPath}
		git blame -a ${filePath} --line-porcelain
		`,
		function(data) {
			var responseArr = [];
			var dataArr = data.split('\n');
			var restart = true;
			var sha = '';
			var message = '';
			var author = '';
			for (var i = 0; i < dataArr.length; i++) {
				var line = dataArr[i];

				if (restart) {
					sha = line.substring(0, 8);
					restart = false;
				}

				if (line.includes('author ')) {
					author = line.slice(7);
				}

				if (line.includes('summary')) {
					message = line.slice(8).slice(0, 40);
				}

				if (line.includes('\t')) {
					responseArr.push(sha);
					responseArr.push(author);
					responseArr.push(message);
					restart = true;
					continue;
				}
			}
			return res.json({
				'res': responseArr
			});
		}
	);
}

export default { gitBlame, gitGet };
