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
	if (req.query.url && req.query.folderPath && req.query.file && req.query.sha) {
		var url = 'https://github.com/' + decodeURI(req.query.url);
		var filePath = decodeURI(req.query.file);
		var folderPath = decodeURI(req.query.folderPath);
		var sha = decodeURI(req.query.sha);
	}
	cmd.get(
		`
		cd git
		git clone ${url}
		cd ${folderPath}
		git checkout ${sha}
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
					if (line.includes("Your branch")) {
						sha = 'master';
					} else {
						sha = line.substring(0, 8);
					}
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

function gitCommit(req, res) {
	if (req.query.repoName) {
		var repoName = decodeURI(req.query.repoName);
	}

	var options = {
		host: 'api.github.com',
    path: '/repos/' + repoName + '/stats/contributors',
		method: 'GET',
    headers: {'user-agent': 'node.js'}
	};

	console.log(options);

  new require('https').get(options, function(response) {
		response.setEncoding('utf8');
		var allData = ''
		response.on('data', function(data) {
      allData += data;
    });
		response.on('end', function() {
			var contributors = [];

			function ignoreCaseComparator(s1, s2) {
				var s1lower = s1.toLowerCase();
				var s2lower = s2.toLowerCase();
				return s1lower > s2lower? 1 : (s1lower < s2lower? -1 : 0);
			}

			var data = JSON.parse(allData);

			// Add contributors into contributors array
			for (var i = 0; i < data.length; i++) {
				contributors.push(data[i]['author']['login']);
			}

			contributors.sort(ignoreCaseComparator);

			return res.json({
				'res': contributors
			});
		});
		response.on('error', function(err) {
			return res.json({
				'res': 'error'
			});
		});
	});
}

export default { gitBlame, gitGet, gitCommit };
