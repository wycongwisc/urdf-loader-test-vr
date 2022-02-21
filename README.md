# VR Training Platform

The application is hosted [here](https://wycongwisc.github.io/urdf-loader-test-vr/).

## Todo 

- [ ] Add visual indicators when distance between end effector and target gets too large
- [ ] Add UI explaning how to switch between control methods (have a button that opens and closes UI)
- [ ] Add UI explaning task and on task completion

## Data

*NOTE: Data collection is currently disabled.*

Currently, data is stored in Google Sheets using Google Apps Scripts and the Google Sheets API. The "database" can be found [here](https://drive.google.com/drive/folders/1T90hAXaHdQIh-kv27N346yu3MOC9gFvM?usp=sharing).

- The `master` spreadsheet stores the ID of the spreadsheet that subsequent POST requests will write to. This value will update dynamically; once a sheet reaches 500,000 rows the script will automatically create a new spreadsheet and update the current sheet ID. The script is also linked to this spreadsheet (go to Extensions > `Apps Script).
- The `sessions` spreadsheet stores a randomely generated session ID, a timestamp, and the operating system of the user each time the application is loaded.
- All other spreadsheets contain data about the robot which is logged every 5 milleseconds. Each entry also contains a session ID which corresponds to those in the `sessions` spreadsheet. The name of each spreadsheet is the timestamp of the first entry.


## Debugging VR

*NOTE: This assumes developer mode is enabled in the Quest and `adb` is installed.*

1. Start a live server with VSCode. 
2. Open the terminal and type the command `adb reverse tcp:<port> tcp:<port>` where `<port>` corresponds to the port the live server is running on.
3. With the live server running, go to `http://localhost:<port>` on the Quest (you should be able to see the application).
4. To use the chrome debugger, go to `chrome://inspect/#devices` on your PC and click `inspect`.