// -------------------------------------------------- //
// --- behance downloader - version 0.1.0 ----------- //
// --- Author: vk.com/f30d0r ------------------------ //
// --- MIT license ---------------------------------- //
// -------------------------------------------------- //

var request = require('request');
var cheerio = require('cheerio');

var http = require('https');
var fs = require('fs');

var projects_arr = [];

if (!process.argv[2]) {
	anyKey('Username undefined! Press ENTER to exit...');
} else {
	var user = process.argv[2];
	loadProdjects(false);
}

// проверяем наличие папки download, если нет, то создаем
if (!fs.existsSync('./download')){
    fs.mkdirSync('./download');
}

function loadProdjects(offset) {
	if (offset==false){
		offset="";
		console.log('Preparing projects list...');
	} else {
		offset="?offset="+offset
	}
	request({uri:'https://www.behance.net/'+user+offset, method:'GET', encoding:'binary'},
    function (err, res, page) {
		var $=cheerio.load(page);
		
		var projectsElements = $('.projectName.cover-name-link');
		
		projectsElements.each(function(){
			var _this = $(this);
			projects_arr.push([_this.attr('href'),_this.text()]);
		});
		
		offset = $('div[data-id]').eq($('div[data-id]').length-1).attr('data-id');
		if(offset==undefined) {
			downloadProject();
			console.log('Projects list prepared.');
		} else {
			loadProdjects(offset);
		}
	});	
};

var projectCounter = 0;

// проверяем наличие папки по имени пользователя, если нет, то создаем
if (!fs.existsSync('./download/'+user)){
    fs.mkdirSync('./download/'+user);
}

function downloadProject() {
	request({uri:projects_arr[projectCounter][0], method:'GET', encoding:'binary'},
	function (err, res, page) {
		//Идём по DOM-дереву CSS-селекторами
		var $=cheerio.load(page);
		
		if ($('[data-hd-src]')=="") {
			images_arr = $('.project-module-image img');
		} else {
			images_arr = $('[data-hd-src]');
		}
		
		var folder = projects_arr[projectCounter][1].replace(/([^a-z0-9]+)/gi, "_");
		console.log('\n'+folder);
		if (!fs.existsSync('./download/'+user+'/'+folder)){
			fs.mkdirSync('./download/'+user+'/'+folder);
		}
		
		// рекурсия загрузки картинок
		var imageCounter = 0;
		function downloadImages() {
			if (images_arr[imageCounter]['attribs']['data-hd-src']==undefined) {
				var href = images_arr[imageCounter]['attribs']['src'];
			} else {
				var href = images_arr[imageCounter]['attribs']['data-hd-src'];
			}
			
			console.log(href);
			
			var fileName = href.slice(href.lastIndexOf('/'));
			var file = fs.createWriteStream('./download/'+user+'/'+folder+'/'+fileName);
			var request = http.get(href, function(response) {
				response.pipe(file);
				imageCounter++;
				if (imageCounter < images_arr.length - 1) {
					downloadImages();
				} else {
					projectCounter++;
					if (projectCounter<projects_arr.length-1) {
						downloadProject();
					} else {
						anyKey('Process done. Press ENTER to exit...');
					}
				}
			});
		}
		downloadImages();
	});
}

function anyKey(text) {
	console.log(text);
	process.stdin.on('data',
		function(data) {
			process.exit(0);
		}
	);
}