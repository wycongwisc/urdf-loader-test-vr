import { TextureLoader } from 'three';
import { v4 as id } from 'uuid'

export class Data {

    buffer = new Map();
    BUFFER_SIZE = 500; // number of data entries stored before a POST request is called
    SESSION_ID = id();
    SCRIPT_PATH = "https://script.google.com/macros/s/AKfycbzHU5Nb1flTSAmQCqMb27CzWZDe4qz5ZMzihYl_AJGGMpNjbCoyT-LTO_zLQbsyjwI5/exec";

    constructor(params) {
        this.post([[new Date(), navigator.platform]], 'session')
    }

    post(data, type) {
        // add session id to beginning of each row
        for (const row of data) row.unshift(this.SESSION_ID)
        
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
            })
        }).then(res => {
            console.log("Request complete! response:", res);
        })
    }

    /**
     * Pushes a single data entry into the buffer
     * @param {Array} row 
     * @param {String} type 
     */
    push(row, type) {
        const data = this.buffer.get(type);
        if (!data) {
            this.buffer.set(type, [row]);
            return
        } else {
            data.push(row);
        }

        if (data.length >= this.BUFFER_SIZE) this.flush(type);
    }


    flush(type) {
        const data = this.buffer.get(type);

        if (!data || data.length === 0) return false;

        this.post(data, type);
        this.buffer.set(type, []);
        return true;
    }
}
