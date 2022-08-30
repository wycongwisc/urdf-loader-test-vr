import * as T from 'three';
import { v4 as id } from 'uuid'

export class Data {

    buffer = [];
    BUFFER_SIZE = 500; // number of data entries stored before a POST request is called
    SESSION_ID = id();
    SCRIPT_PATH = 'https://script.google.com/macros/s/AKfycbzwApGpPCnrxRGrndclYFbO4szYDzn0llJamw8DqAUKVwEUeLGRBy-OMIoPm7EUapBO/exec';
    sceneCount = 0; 

    constructor(params) {
    }

    /**
     * Sends the data to Google Sheets. Call this method directly to bypass the buffer.
     * @param {} data 
     * @param {*} table 
     */
    post(data, type, params = {}) {
        console.log(type, data, params);
        // return;
        

        // add session id to beginning of each row
        // for (const row of data) row.unshift(this.SESSION_ID)
        
        fetch(this.SCRIPT_PATH, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }, 
            mode: 'no-cors',
            body: JSON.stringify({
                data,
                type,
                params
            })
        }).then(res => {
            console.log("Request complete! response:", res);
        })
    }

    log(id, row) {
        if (!id) return;
        
        this.buffer.push(row);
        if (this.buffer.length >= this.BUFFER_SIZE) this.flush(id);
    }

    flush(id) {
        this.post(this.buffer, 'trial', {
            sessionId: this.SESSION_ID,
            trialId: id,
        })
        this.buffer = [];
    }

    async initSession() {
        const ip = await fetch('https://api.ipify.org').then(response => { return response.text() });
        // const locationData = await fetch(`http://ip-api.com/json/${ip}`).then(response => { return response.json() });

        const data = [[
            new Date(), 
            this.SESSION_ID,
            navigator.platform,
            ip,
            // locationData.city,
            // locationData.regionName,
            // locationData.country
        ]]

        this.post(data, 'session', {
            sessionId: this.SESSION_ID
        });
    }

    /**
     * 
     * @param {Array} objects 
     */
    createTrial(header, initState) {
        const trialId = id();

        const data = [header, initState];
        this.post(data, 'create-trial', {
            sessionId: this.SESSION_ID,
            trialId,
        });

        return trialId;
    }

    endTrial(data, id) {
        this.flush(id);
        this.post(data, 'end-trial', {
            sessionId: this.SESSION_ID,
            trialId: id,
        });
    }



}
