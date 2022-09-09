# Studio

A web-based application for running robot experiments in VR. The application is hosted [here](https://wycongwisc.github.io/urdf-loader-test-vr/).

## Installation

First, clone the repository and pull the submodules with
```console
git submodule init
git submodule update
```
Then follow the instructions [here](./relaxed_ik_web/README.md). Finally, run the following commands:
```console
npm install
npm update
npm run build
```
Note that `npm run build` must be executed everytime changes are made to the code.

## Design

Any class with a `static async init()` method should use this method to create a class instance instead of the constructor. For example:
```js
const control = await Control.init(); // do this
const control = new Control(); // not this
```
This is because the class requires asynchrounous operations on initialization which can not be done in the constructor. For more information, see this [post](https://stackoverflow.com/questions/43431550/async-await-class-constructor).

*NOTE: The following headings and subheadings correspond to the file structure of the application.*

### /index.js

This is the entry point of the application. It sets up the THREE scene, loads in the robot and its corresponding physics objects, and initializes the [components](#components) of the application. It also creates three separate loops: one for logic, one for physics, and one for rendering. 

### Components

Components form the core functionality of the application and are used across all tasks.

#### /Control.js

This contains an array of tasks and a finite state machine that is used to navigate between tasks. The update function calls the update function of the current task as determined by the state of the finite state machine.

#### /Controller.js

This is a wrapper class that provides a cleaner interface for configuring the VR controllers. Since THREE only provides events for the trigger and grip button, the rest of the buttons must be accessed through the `gamepad.buttons` property of the controller (see the official documentation [here](https://www.w3.org/TR/webxr-gamepads-module-1/)). 

This class is designed to map all controls to a single "main" controller by default (which is determined by the `hand` property). However you can still add functionality to the other controller by manually calling the `get(hand)` method. This is probably not a good design decision and should be changed in the future.

*NOTE: The `squeeze` event is renamed to `grip` and the `select` event is renamed to `trigger` in order to maintain consistency.*

#### /Condition.js

This contains an array of [modules](#modules) and a finite state machine that is used to control the "control state" (ex. `IDLE`, `DRAG_CONTROL`, `REMOTE_CONTROL`, etc.). This state machine is constructed dynamically because it is shared by all of the modules.

This class is designed to setup the various conditions an experiment may have, which is determined by the array of modules that are passed in.

#### /Data.js

This contains all functionality relating to data storage and the Google Sheets backend. A buffer is used to minimize the number of API calls that need be made. By default, the application will wait until it obtains 500 rows of data before making a `POST` request.

*NOTE: The `SCRIPT_PATH` variable must be updated whenever the Google Apps Script is updated. More on this [here].*

#### /UI.js 

This contains methods that are used to create and interact with UI elements in VR (through raycasting). The `elements` array contains all UI elements that have been created and can be logged for debugging purposes.

### Modules

Modules add specific functionality to the environment and can be used in conjunction with the [Condition](#conditionjs) class to create the desired environment for each portion of an experiment.

*NOTE: Modules that are commented out are outdated and must be updated in order to work.*

### Objects

These are wrapper classes that are used to load in the corresponding object models (`.glb` or `.gltf`) and create the corresponding physics components. This is done manually but in the future it may be possible to do this automatically. The code to do this already exists in the `loadRAPIERfromGLTF()`  function in `/utilities/loaders` however it can not be used due to some shortcomings of the RAPIER library (for more information, see the method header).

Each class also contains methods that handle object interactions (ex. picking up the block).

### Tasks

Each task inherits from the `Task` parent class, which contains a finite state machine for the trials within the task and some methods for data logging. Each task can use the methods exposed from the parent class (`onStart()`, `onStop()`, `onUpdate()`) to perform task-specific operations. The constructor for each class passes an array of callback functions to the super class which are called before each trial begins:

```js
// in the constructor of the Stack class
super('stack', params, condition, options, [
    () => { ... }, // set up first trial
    () => { ... } // set up second trial
])
```

These can be used to set up a trial before it begins. Each task also contains an `objects` property that contains all non-robot objects involved in the task. The data associated with these objects (position, orientation, scale) are recorded and stored in the database.

Tutorial tasks are used to teach the user how to do certain things. These must be used with the corresponding modules (ex. `DragControl` with `DragControlTutorial`), otherwise there will be no way to progress through the task.

### UI

These are wrapper classes that are used by the `UI` class to create the VR UI. Internally, it uses [this](https://github.com/felixmariotto/three-mesh-ui) library.

### Utilities

This folder contains a collection of functions and contants that are used throughout the application. 

## Miscallaneous

### Debugging from the Quest

*NOTE: This assumes developer mode is enabled in the Quest and `adb` is installed.*

2. Plug the Quest into the computer.
2. Start the application on a live server with VSCode. 
3. Open the terminal and type the command `adb reverse tcp:<port> tcp:<port>` where `<port>` corresponds to the port the live server is running on.
4. With the live server running, go to `http://localhost:<port>` in the Quest browser. The application should appear.
5. To use the chrome debugger, go to `chrome://inspect/#devices` in Google Chrome and click `inspect`.

### Setting up a Google Sheets Backend with Google Apps Scripts

#### Creating the Google Apps Script

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

#### Helpful Functions

##### Writing to a Spreadsheet

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

##### Creating a Spreadsheet

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

#### Deployment

To deploy the script, go to `Deploy` > `New Deployment` > `Deploy` (make sure to deploy as a Web app). Then, copy the URL of the deployed Web app.

##### Connecting to the Frontend

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

#### Limitations

A spreadsheet cannot contain more than [10 million cells](https://support.google.com/drive/answer/37603). If the amount of data may exceed this number, consider dynamically creating spreadsheets once the current spreadsheet reaches a certain number of rows. Additionally, deployed Apps Script have daily quotas, which can be found [here](https://developers.google.com/apps-script/guides/services/quotas).