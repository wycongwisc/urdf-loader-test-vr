
export class DataControl {
    constructor(params) {

        this.CLIENT_ID = '715533057109-fhq9oj5oqml5m835lpfl33mollm1lp0e.apps.googleusercontent.com';
        this.API_KEY = 'AIzaSyCmvMxe3_1O3sppBOQsE_YBIMPqck87W9w';
        this.DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
        this.SCOPES = "https://www.googleapis.com/auth/spreadsheets";
        this.SPREADSHEET_ID = '1HFSNfwMQ_Axr1X6zkcccIGTya4ikqhctO74BewK-4x4'

        this.initClient = this.initClient.bind(this);
        this.updateSignInStatus = this.updateSignInStatus.bind(this);
    }

    async init() {
        return new Promise(function (resolve, reject) {
            let script = document.createElement('script');
            script.src = "https://apis.google.com/js/api.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        }).then(() => gapi.load('client:auth2', this.initClient))
    }

    initClient() {
        gapi.client.init({
            apiKey: this.API_KEY,
            clientId: this.CLIENT_ID,
            discoveryDocs: this.DISCOVERY_DOCS,
            scope: this.SCOPES
        }).then(() => {
            console.log(this)
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus);
  
            // Handle the initial sign-in state.
            this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        }, function(error) {
            throw new Error(JSON.stringify(error, null, 2))
        });
    }

    handleSignInClick(event) {
        gapi.auth2.getAuthInstance().signIn();
    }

    handleSignOutClick(event) {
        gapi.auth2.getAuthInstance().signOut();
    }

    updateSignInStatus(isSignedIn) {
        if (isSignedIn) {
            this.signInButton.style.display = 'none';
            this.signOutButton.style.display = 'block';
          } else {
            this.signInButton.style.display = 'block';
            this.signOutButton.style.display = 'none';
          }
    }

    isSignedIn() {
        return gapi.auth2?.getAuthInstance().isSignedIn.get();
    }

    createButtons() {
        this.signInButton = document.createElement('button');
        this.signInButton.innerHTML = 'Sign In';
        this.signInButton.id = 'sign-in-button'
        this.signInButton.addEventListener('click', this.handleSignInClick);
        document.querySelector('#inputs').appendChild(this.signInButton);

        this.signOutButton = document.createElement('button');
        this.signOutButton.innerHTML = 'Sign Out';
        this.signOutButton.id = 'sign-out-button'
        this.signOutButton.addEventListener('click', this.handleSignOutClick);
        document.querySelector('#inputs').appendChild(this.signOutButton);

        this.signOutButton.style.display = 'none';
    }

    /**
     * 
     * @param {*} values array representing a row in the table
     */
    appendRow(values) {
        if (this.isSignedIn()) {
            gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                valueInputOption: 'RAW',
                range: 'Sheet1!A1',
                resource: { values: [values] }
              }).then((response) => {
                let result = response.result;
                console.log(`${result.updates.updatedCells} cells appended.`)
              })
        }
    }
}
