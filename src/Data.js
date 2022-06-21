import * as T from 'three';
import { v4 as id } from 'uuid'

export class Data {

    buffer = new Map();
    BUFFER_SIZE = 500; // number of data entries stored before a POST request is called
    SESSION_ID = id();
    SCRIPT_PATH = "https://script.google.com/macros/s/AKfycbzHU5Nb1flTSAmQCqMb27CzWZDe4qz5ZMzihYl_AJGGMpNjbCoyT-LTO_zLQbsyjwI5/exec";

    constructor(params) {
    }

    post(data, type) {
        console.log(type, data)

        // add session id to beginning of each row
        // for (const row of data) row.unshift(this.SESSION_ID)
        
        // fetch(this.SCRIPT_PATH, {
        //     method: "POST",
        //     headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json'
        //     }, 
        //     mode: 'no-cors',
        //     body: JSON.stringify({
        //         data,
        //         type,
        //     })
        // }).then(res => {
        //     console.log("Request complete! response:", res);
        // })
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

    async logSession(modules) {
        const ip = await fetch('https://api.ipify.org').then(response => { return response.text() });
        const locationData = await fetch(`http://ip-api.com/json/${ip}`).then(response => { return response.json() });

        const row = [
            new Date(), 
            this.SESSION_ID,
            navigator.platform,
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

    logRobot(t, fsm, robot, target) {
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

    log(t, data, type) {
        this.push([
            t,
            this.SESSION_ID,
            ...data,
        ], type);
    }

    
}
