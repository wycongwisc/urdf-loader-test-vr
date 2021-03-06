import * as T from 'three';
import { v4 as id } from 'uuid'

export class Data {

    buffer = new Map();
    BUFFER_SIZE = 500; // number of data entries stored before a POST request is called
    SESSION_ID = id();
    SCRIPT_PATH = "https://script.google.com/macros/s/AKfycbywMorCojPbcZT3vhueV1nbH-0YjHv-zFtrxHUpyaBt4gRoJx_FOYC1ewo09uviNek8/exec";

    constructor(params) {
    }

    /**
     * Sends the data to Google Sheets. Call this method directly to bypass the buffer.
     * @param {} data 
     * @param {*} table 
     */
    post(data, table) {
        console.log(`Posting to ${table}`, data);

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
                table,
            })
        }).then(res => {
            console.log("Request complete! response:", res);
        })
    }

    /**
     * Pushes a single data entry into the buffer. Call this method for high frequency logs so that POST requests can be batched.
     * @param {Array} row 
     * @param {String} type 
     */
    push(row, table) {
        const data = this.buffer.get(table);
        if (!data) {
            this.buffer.set(table, [row]);
            return
        } else {
            data.push(row);
        }

        if (data.length >= this.BUFFER_SIZE) this.flush(table);
    }

    /**
     * Makes a POST request for all data in the specified buffer.
     * @param {String} type Buffer name
     * @returns True if buffer has been flushed, false otherwise
     */
    flush(table) {
        const data = this.buffer.get(table);

        if (!data || data.length === 0) return false;

        console.log(`Flushing ${table} buffer (${data.length} entries)`);
        this.post(data, table);
        this.buffer.set(table, []);
        return true;
    }

    async logSession(modules) {
        const ip = await fetch('https://api.ipify.org').then(response => { return response.text() });
        const locationData = await fetch(`http://ip-api.com/json/${ip}`).then(response => { return response.json() });

        const row = [
            new Date(), 
            this.SESSION_ID,
            navigator.platform,
            ip,
            locationData.city,
            locationData.regionName,
            locationData.country
        ]

        let moduleList = '';
        for (const module of modules) {
            moduleList += module.name;
            if (module.name === 'tasks') {
                moduleList += '['
                for (const task of module.tasks) {
                    moduleList += task.name + ' '
                }
                moduleList = moduleList.substring(0, moduleList.length - 1);
                moduleList += ']';
            }
            moduleList += ' ';
        }
        moduleList = moduleList.substring(0, moduleList.length - 1);
        row.push(moduleList);

        // does not use the buffer because this only happens once
        this.post([row], 'session');
    }

    logRobot(t, fsm, robot, eePose, target) {
        const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        const gripperDistance = pos1.distanceTo(pos2);

        const row = [
            t, 
            this.SESSION_ID, 
            robot.robotName, 
            fsm.state
        ];
        for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
            const currJoint = robot.joints[joint];
            row.push(currJoint.jointValue[0]);
        }
        row.push(gripperDistance);
        row.push(`${eePose.posi.x} ${eePose.posi.y} ${eePose.posi.z}`);
        row.push(`${eePose.ori.x} ${eePose.ori.y} ${eePose.ori.z} ${eePose.ori.w}`);
        row.push(`${target.position.x} ${target.position.y} ${target.position.z}`)
        row.push(`${target.quaternion.x} ${target.quaternion.y} ${target.quaternion.z} ${target.quaternion.w}`)
        this.push(row, 'robot');
    }

    logUser(t, camera, controller1, controller2, hand) {
        const worldDirection = new T.Vector3();
        camera.getWorldDirection(worldDirection);

        this.push([
            t, 
            this.SESSION_ID,
            `${camera.position.x} ${camera.position.y} ${camera.position.z}`,
            `${camera.quaternion.x} ${camera.quaternion.y} ${camera.quaternion.z} ${camera.quaternion.w}`,
            `${worldDirection.x} ${worldDirection.y} ${worldDirection.z}`,
            `${controller1.position.x} ${controller1.position.y} ${controller1.position.z}`,
            `${controller1.quaternion.x} ${controller1.quaternion.y} ${controller1.quaternion.z} ${controller1.quaternion.w}`,
            `${controller2.position.x} ${controller2.position.y} ${controller2.position.z}`,
            `${controller2.quaternion.x} ${controller2.quaternion.y} ${controller2.quaternion.z} ${controller2.quaternion.w}`,
            hand,
        ], 'user');
    }

    logTask(t, task) {
        this.push([
            t, 
            this.SESSION_ID, 
            task.id,
            task.name,
            task.startTime
        ], 'task');
    }

    log(t, data, table) {
        this.push([
            t,
            this.SESSION_ID,
            ...data,
        ], table);
    }

    
}
