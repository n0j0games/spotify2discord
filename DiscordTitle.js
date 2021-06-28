const requestup = require("request");
const {promisify} = require("util");
const config = require("./config.json");
const fs = require("fs");
const express = require("express");
const app = express();
const request = promisify(requestup);

let TokenCheck;
console.log("Checking if spotify token exists...");

try {
	TokenCheck = require("./token.json");
} catch (e) {
	fs.writeFileSync(__dirname + "/token.json", JSON.stringify({
		AccessToken: null,
		RefreshToken: null
	}));
	console.error("Token.json was not found.\nRestart program to proceed.\n")
	process.exit();
}

// Initialise vars
let SpotifyToken = GetSpotifyToken();
let SongSeconds;
let ExpressServer;
let SpotifyBase64 = new Buffer.from(`${config.SpotifyApi.client_id}:${config.SpotifyApi.client_secret}`).toString("base64");
let CurrentURI = "";
let IsPaused = false;

app.get("/authorize", async (req, res) => {
	if (req.query.code) {
		let Tokens = await request({
			url: `https://accounts.spotify.com/api/token`,
			method: "POST",
			form: {
				grant_type: "authorization_code",
				code: req.query.code,
				redirect_uri: config.SpotifyApi.redirect_uri
			},
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"Authorization": "Basic " + SpotifyBase64
			}
		});
		let TokenData = JSON.parse(Tokens.body);
		let AccessToken = TokenData.access_token;
		let RefreshToken = TokenData.refresh_token;

		fs.writeFileSync(__dirname + "/token.json", JSON.stringify({
			AccessToken: AccessToken,
			RefreshToken: RefreshToken
		}));

		CheckForChange();
		ExpressServer.close();
		console.log("Got token, killing server.");
	}
	res.send("Authorizing.");
});


if (TokenCheck.AccessToken == ("" || null) || TokenCheck.RefreshToken == ("" || null)) {
	console.log(`Please visit:\nhttps://accounts.spotify.com/authorize?response_type=code&client_id=${config.SpotifyApi.client_id}&scope=user-read-playback-state&redirect_uri=${config.SpotifyApi.redirect_uri}\n`);
	ExpressServer = app.listen(config.callback_port);
} else {
	console.log("Token found, skipping authentication");
	CheckForChange();
}

TokenCheck = null;

function GetSpotifyToken() {
	let TokenData = JSON.parse(fs.readFileSync(__dirname + "/token.json"));
	return TokenData.AccessToken;
}

function GetSpotifyRefreshToken() {
	let TokenData = JSON.parse(fs.readFileSync(__dirname + "/token.json"));
	return TokenData.RefreshToken;
}

//Refreshing spotify token
async function RefreshToken() {
	let RT = GetSpotifyRefreshToken();
	let Tokens = await request({
		url: `https://accounts.spotify.com/api/token`,
		method: "POST",
		form: {
			grant_type: "refresh_token",
			refresh_token: RT
		},
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Authorization": "Basic " + SpotifyBase64
		}
	});

	let TokenData = JSON.parse(Tokens.body);
	let AccessToken = TokenData.access_token;

	fs.writeFileSync(__dirname + "/token.json", JSON.stringify({
		AccessToken: AccessToken,
		RefreshToken: RT
	}));
}

let DiscordToken = config.DiscordToken;

if (DiscordToken === ("optional!" || "" || null)) {
	const WebSocket = require("ws");

	const ws = new WebSocket("ws://localhost:6463/?v=1", {
		origin: "https://discordapp.com"
	});

	ws.onerror = function (event) {
        console.log("Can't connect to Discord. Open Discord and try again");
				process.exit();
  };

	ws.on("message", async (msg) => {
		const data = JSON.parse(msg);

		switch (data.cmd) {
			case "DISPATCH":
				if (data.evt === "READY") {
					ws.send(JSON.stringify({
						cmd: "SUBSCRIBE",
						args: {},
						evt: "OVERLAY",
						nonce: "auth_one"
					}));

					ws.send(JSON.stringify({
						cmd: "OVERLAY",
						args: {
							type: "CONNECT",
							pid: -1
						},
						nonce: "auth_two"
					}));
				}
				else if (data.evt === "OVERLAY") {
					const proxyEvent = data.data;

					if (proxyEvent.type === 'DISPATCH' && proxyEvent.payloads) {
						for (const payload of proxyEvent.payloads) {
							if (payload.type === "OVERLAY_INITIALIZE") {
								console.log("Stole discord token. Token: " + payload.token);
								console.log("Running");
								DiscordToken = payload.token;
							}
						}
					}
				}
				break;
		}
	});
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//Set discord status & status-emote
function SetStatus(status, emote) {
	let currentdate = new Date();
	currentdate = new Date(currentdate.getTime() + 7*60000);
	let formatted = currentdate.toISOString();

	request({method: "PATCH", url: "https://discordapp.com/api/v6/users/@me/settings", body:JSON.stringify({
		custom_status: {
			text: status,
			expires_at: formatted,
			emoji_name: emote
		}
	}), headers: {Authorization: DiscordToken, "Content-Type": "application/json"}});
}

//Remove discord status
function ResetStatus(){
	request({method: "PATCH", url: "https://discordapp.com/api/v6/users/@me/settings", body:JSON.stringify({
		custom_status: {
			text: null,
			emoji_name: null
		}
	}), headers: {Authorization: DiscordToken, "Content-Type": "application/json"}});
}

//Checking for song change
async function CheckForChange() {
	try {
		let res = await request({
			url: "https://api.spotify.com/v1/me/player/currently-playing?market=DE",
			headers: {
				Authorization: "Bearer " + SpotifyToken
			}
		});
		IsPaused = res.statusCode == 204 ? true : false;
		if (!IsPaused) {
			let data = JSON.parse(res.body);
			let songdata = data.item;

			IsPaused = !data.is_playing;

			if (CurrentURI != data.item.uri && !IsPaused) {
				CurrentURI = data.item.uri;

				let artists = [];
				for (let artistIndex in songdata.artists) {
					let artist = songdata.artists[artistIndex];
					artists.push(artist.name);
				}

				//console.log(`SID: ${CurrentURI}\n`);
				let status = `${toUnicodeVariant(songdata.name,"bold")} - `;
				for (let i=0; i<songdata.artists.length-1; i++) {
					status += `${toUnicodeVariant(songdata.artists[i].name,"italic")}, `;
				}
				status += `${toUnicodeVariant(songdata.artists[songdata.artists.length-1].name,"italic")}`;
				// \n ${toUnicodeVariant("from","bold")} ${toUnicodeVariant(songdata.album.name,"italic")}
				SetStatus(status, "\uD83C\uDFB5");
			}
			if (IsPaused){
				CurrentURI = "";
				ResetStatus();
			}
		}
	}
	catch(e) {
		console.log(`Token gone invalid, regenerating`);
		await RefreshToken();
		SpotifyToken = GetSpotifyToken();
		CheckForChange();
		return;
	}
	if (DiscordToken == "") {
		console.log("Token not grabbed yet. Waiting...");
		CheckForChange();
		return;
	}
	setTimeout(CheckForChange, config.song_refresh);
}

//
// unicodeVariant
//

function toUnicodeVariant(str, variant, flags) {

	const offsets = {
	  m: [0x1d670, 0x1d7f6],
	  b: [0x1d400, 0x1d7ce],
	  i: [0x1d434, 0x00030],
	  bi: [0x1d468, 0x00030],
	  c: [0x1d49c, 0x00030],
	  bc: [0x1d4d0, 0x00030],
	  g: [0x1d504, 0x00030],
	  d: [0x1d538, 0x1d7d8],
	  bg: [0x1d56c, 0x00030],
	  s: [0x1d5a0, 0x1d7e2],
	  bs: [0x1d5d4, 0x1d7ec],
	  is: [0x1d608, 0x00030],
	  bis: [0x1d63c, 0x00030],
		o: [0x24B6, 0x2460],
		p: [0x249C, 0x2474],
		w: [0xff21, 0xff10],
		u: [0x2090, 0xff10]
	}

	const variantOffsets = {
		'monospace': 'm',
		'bold' : 'b',
		'italic' : 'i',
		'bold italic' : 'bi',
		'script': 'c',
		'bold script': 'bc',
		'gothic': 'g',
		'gothic bold': 'bg',
		'doublestruck': 'd',
		'sans': 's',
		'bold sans' : 'bs',
		'italic sans': 'is',
		'bold italic sans': 'bis',
		'parenthesis': 'p',
		'circled': 'o',
		'fullwidth': 'w'
	}

	// special characters (absolute values)
	var special = {
	  m: {
	    ' ': 0x2000,
	    '-': 0x2013
	  },
	  i: {
	    'h': 0x210e
	  },
	  g: {
	    'C': 0x212d,
	    'H': 0x210c,
	    'I': 0x2111,
	    'R': 0x211c,
	    'Z': 0x2128
	  },
		o: {
			'0': 0x24EA,
			'1': 0x2460,
			'2': 0x2461,
			'3': 0x2462,
			'4': 0x2463,
			'5': 0x2464,
			'6': 0x2465,
			'7': 0x2466,
			'8': 0x2467,
			'9': 0x2468,
		},
		p: {},
		w: {}
	}
	//support for parenthesized latin letters small cases
	for (var i = 97; i <= 122; i++) {
		special.p[String.fromCharCode(i)] = 0x249C + (i-97)
	}
	//support for full width latin letters small cases
	for (var i = 97; i <= 122; i++) {
		special.w[String.fromCharCode(i)] = 0xff41 + (i-97)
	}

	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
	const numbers = '0123456789';

	var getType = function(variant) {
		if (variantOffsets[variant]) return variantOffsets[variant]
		if (offsets[variant]) return variant;
		return 'm'; //monospace as default
	}
	var getFlag = function(flag, flags) {
		if (!flags) return false
		return flags.split(',').indexOf(flag)>-1
	}

	var type = getType(variant);
	var underline = getFlag('underline', flags);
	var strike = getFlag('strike', flags);
  var result = '';

  for (var k of str) {
    let index
    let c = k
    if (special[type] && special[type][c]) c = String.fromCodePoint(special[type][c])
    if (type && (index = chars.indexOf(c)) > -1) {
      result += String.fromCodePoint(index + offsets[type][0])
    } else if (type && (index = numbers.indexOf(c)) > -1) {
      result += String.fromCodePoint(index + offsets[type][1])
    } else {
      result += c
    }
    if (underline) result += '\u0332' // add combining underline
    if (strike) result += '\u0336' // add combining strike
  }
	return result
}
