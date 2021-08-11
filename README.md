# spotify2discord

![](https://i.imgur.com/FdA70QT.png)

### Installation & run:
* Install [Node.js](https://nodejs.org/en/)
* cd into the directory and use `npm i` to initialize Node in this directory
* Head to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications) and create an application.
* Copy the `client_id` and `client_secret` from your created application and place them in the `config.json` under `SpotifyApi`
* Make sure your `redirect_uri` in Spotify Applications is set to `http://127.0.0.1:3000/authorize` (unless changed in config)
* Use `node DiscordTitle.js` to start up the program
* After the first run follow the link on cmd (Spotify Authorization). Restart your program

#### Make sure to enter a Discord token or the app will crash if Discord isn't already running before starting the app.

Note: discordTitle.js is adapted from [sadboilogan's DiscordLyrics.js](https://github.com/sadboilogan/DiscordLyrics). Check it out!
