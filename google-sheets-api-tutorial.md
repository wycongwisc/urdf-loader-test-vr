# Setting up a Google Sheets Backend with Google Apps Scripts

## Creating the Google Apps Script

First, create a Google Apps Script by doing one of the following (either option is fine):
1. In Google Drive, go to `New` > `More` > `Google Apps Scripts`
2. In a spreadsheet, go to `Extensions` > `Apps Scripts`

Next, create a script and define a `doPost()` function. This function will execute everytime a `POST` request is sent to the deployed script (more on deployment later) and will receive all data in the request. For example,
```js
function doPost(e) {
    try {
        // do stuff with data here

        // access the body of the POST request
        console.log(JSON.parse(e.postData.contents))
    } catch(error) {
        Logger.log(error); 
    }
}
```
If multiple users are making requests to the script at the same time, add the following lines to the `doPost()` function to avoid concurrent writing:
```js
const lock = LockService.getScriptLock();
lock.waitLock(30000); // 30 s

try {
    // ...
} catch(error) {
    // ...
} finally {
    lock.releaseLock();
}
```
The script will attempt to acquire the lock for up to 30 seconds. When the script is locked, only the user who obtained the lock will be able to execute the code.

### Helpful Functions

#### Writing to a Spreadsheet

The following lines of code will write to a sheet inside of a spreadsheet given the ID of the spreadsheet and the name of the sheet (*spreadsheet* refers to the file itself which can contain many *sheets* that are accessible in the bottom tab).

```js
const spreadsheet = SpreadsheetApp.openById(<id>);
const sheet = spreadsheet.getSheetByName(<sheet-name>);
sheet.getRange(<row>, <column>, <numRows>, <numColumns>).setValues(<data>)
```

To find the ID of a spreadsheet, copy the string located at `<id>` in the spreadsheet's URL (see below). 
```js
https://docs.google.com/spreadsheets/d/<id>/edit#gid=0
``` 

To append rows to the end of a sheet, replace `<row>` with `sheet.getLastRow() + 1`. Note that `<data>` must be a two dimensional array. For a complete list of methods, see the [official documentation](https://developers.google.com/apps-script/reference/spreadsheet).

#### Creating a Spreadsheet

The following line of code will create a spreadsheet inside the root folder.
```js
const spreadsheet = SpreadsheetApp.create(<name>);
```
To create a spreadsheet in a different folder, first create the spreadsheet in the root folder, copy the file into the desired folder, then remove the file from the root folder.
```js
const spreadsheet = SpreadsheetApp.create(<name>);

// gets the first folder with the given name
const folder = DriveApp.getFoldersByName(<folder-name>).next();
const file = DriveApp.getFileById(spreadsheet.getId());
folder.addFile(file);

DriveApp.getRootFolder().removefile(file);
```
Note that a spreadsheet will contain a sheet named `Sheet1` on creation.

## Deployment

To deploy the script, go to `Deploy` > `New Deployment` > `Deploy` (make sure to deploy as a Web app). Then, copy the URL of the deployed Web app.

## Connecting to the Frontend

To send a request to your deployed script, use the `fetch` API with the URL obtained above. For example,
```js
fetch(<script-url>, {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, 
    mode: 'no-cors',
    body: JSON.stringify(<your-data>)
})
```

## Limitations

A spreadsheet cannot contain more than [10 million cells](https://support.google.com/drive/answer/37603). If the amount of data may exceed this number, consider dynamically creating spreadsheets once the current spreadsheet reaches a certain number of rows. Additionally, deployed Apps Script have daily quotas, which can be found [here](https://developers.google.com/apps-script/guides/services/quotas).