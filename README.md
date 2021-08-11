# spotify2discord

### Installation & run:
* Install [Node.js](https://nodejs.org/en/)
* cd into the directory and use `npm i` to initialize Node in this directory
* Head to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications) and create an application.
* Copy the `client_id` and `client_secret` from your created application and place them in the `config.json` under `SpotifyApi`
* Make sure your `redirect_uri` is set to `http://127.0.0.1:3000/authorize`.
* Use `node DiscordTitle.js` to start up the program
* Alternatively use `runInBackground.vbs` to run the program without visible console

#### Make sure Discord is running before starting the app

Note: discordTitle.js is adapted from [sadboilogan's DiscordLyrics.js](https://github.com/sadboilogan/DiscordLyrics). Check it out!
