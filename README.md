# VR Training Platform

The application is hosted [here](https://wycongwisc.github.io/urdf-loader-test-vr/).

## Data

Currently, data is stored in Google Sheets using Google Apps Scripts and the Google Sheets API. The "database" can be found [here](https://drive.google.com/drive/folders/1T90hAXaHdQIh-kv27N346yu3MOC9gFvM?usp=sharing).

- The `master` spreadsheet stores the ID of the spreadsheet that subsequent POST requests will write to. This value will update dynamically; once a sheet reaches 500,000 rows the script will automatically create a new spreadsheet and update the current sheet ID. The script is also linked to this spreadsheet (go to Extensions > `Apps Script).
- The `sessions` spreadsheet stores a randomely generated session ID, a timestamp, and the operating system of the user each time the application is loaded.
- All other spreadsheets contain data about the robot which is logged every 5 milleseconds. Each entry also contains a session ID which corresponds to those in the `sessions` spreadsheet. The name of each spreadsheet is the timestamp of the first entry.

*NOTE: Data collection is currently disabled.*