'use strict';

var CYCLE_START = Date.UTC(2026, 8, 27);  // 27 Sep 2026
var SHOWN_KEY = 'tms-shown';

var data = null;
var shown = null;

window.wallpaperPropertyListener = {
	applyUserProperties: function (props) {
		var root = document.documentElement.style;

		if (props.backgroundcolor) root.setProperty('--bg', toCssColor(props.backgroundcolor.value));
		if (props.crosscolor) root.setProperty('--cross', toCssColor(props.crosscolor.value));
		if (props.textcolor) root.setProperty('--text', toCssColor(props.textcolor.value));
		if (props.crosssize) root.setProperty('--cross-size', props.crosssize.value + 'px');
		if (props.textsize) root.setProperty('--text-size', props.textsize.value + 'px');
		if (props.glow) {
			if (props.glow.value) root.removeProperty('--glow');
			else root.setProperty('--glow', 'none');
		}
	}
};

// Wallpaper Engine sends colors as "r g b" with each value from 0 to 1.
function toCssColor(value) {
	return 'rgb(' + value.split(' ').map(function (v) { return Math.round(parseFloat(v) * 255); }).join(',') + ')';
}

function loadJson(url, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', url);
	request.onload = function () {
		if (request.status === 200 || request.status === 0) callback(JSON.parse(request.responseText));
		else showError(url + ' could not be loaded (HTTP ' + request.status + ').');
	};
	request.onerror = function () { showError(url + ' could not be loaded.'); };
	request.send();
}

function showError(message) {
	document.getElementById('verse').textContent = message;
}

function today() {
	return new Date().toDateString();
}

function mod(n, m) {
	return ((n % m) + m) % m;
}

function scheduledVerse() {
	var now = new Date();
	var days = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - CYCLE_START) / 86400000;
	var topic = mod(Math.floor(days / 7), data.topics.length);
	return { topic: topic, verse: mod(days, 7) % data.topics[topic].refs.length };
}

function loadShown() {
	try {
		var saved = JSON.parse(localStorage.getItem(SHOWN_KEY));
		var topic = saved && data.topics[saved.topic];
		if (topic && topic.refs[saved.verse] && saved.date === today()) return saved;
	} catch (e) { /* nothing saved, or storage unavailable */ }
	return null;
}

function show(choice) {
	shown = { date: today(), topic: choice.topic, verse: choice.verse };
	try { localStorage.setItem(SHOWN_KEY, JSON.stringify(shown)); } catch (e) { /* storage unavailable */ }
	render();
}

function render() {
	var topic = data.topics[shown.topic];
	var ref = topic.refs[shown.verse];

	document.getElementById('topic').textContent = topic.series + ' · ' + topic.name;
	document.getElementById('verse').textContent = data.verses[ref];
	document.getElementById('ref').textContent = ref + ' NASB 2020';
}

function showScheduledVerse() {
	if (shown && shown.date === today()) return;
	show(scheduledVerse());
}

function showRandomVerse() {
	var choice;
	do {
		var topic = Math.floor(Math.random() * data.topics.length);
		choice = { topic: topic, verse: Math.floor(Math.random() * data.topics[topic].refs.length) };
	} while (choice.topic === shown.topic && choice.verse === shown.verse);
	show(choice);
}

loadJson('verses.json', function (json) {
	data = json;
	shown = loadShown();
	if (shown) render();
	else showScheduledVerse();
	document.getElementById('content').addEventListener('click', showRandomVerse);
	// The Lockman link opens the site instead of changing the verse.
	document.getElementById('lockman').addEventListener('click', function (e) { e.stopPropagation(); });
	setInterval(showScheduledVerse, 60 * 1000);
});
