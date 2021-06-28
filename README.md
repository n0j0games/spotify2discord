# spotify2discord

## How to use:
* Install [Node.js](https://nodejs.org/en/)
* cd into the directory and use `npm i`
* Head to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications) and create an application.
* Make sure your `redirect_uri` is set to `http://127.0.0.1:3000/authorize` unless changed in the `config.json`.
* Copy the `client_id` and `client_secret` and place them in the `config.json` under `SpotifyApi`
* Use `node DiscordTitle.js` to start up the program.
* Make sure Discord is running
