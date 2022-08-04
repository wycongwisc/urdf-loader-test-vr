import * as T from 'three';
import { v4 as id } from 'uuid'

export class Data {

    buffer = [];
    BUFFER_SIZE = 500; // number of data entries stored before a POST request is called
    SESSION_ID = id();
    SCRIPT_PATH = 'https://script.google.com/macros/s/AKfycbzbmD5OSCvp4LB5zAVMS9v5tCVZCJeZS66bZ9JLFNtlu5CB1KedWGTtDmr-IEpXgMfK/exec';
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

    push(row) {
        this.buffer.push(row);
        if (this.buffer.length >= this.BUFFER_SIZE) this.flush();
    }

    flush() {
        this.post(this.buffer, 'scene', {
            sessionId: this.SESSION_ID,
            sceneId: this.currentSceneId,
            sceneName: `scene-${this.sceneCount.toString().padStart(2, '0')}`
        })
        this.buffer = [];
    }

    // log initial configs of every object in the scene
    initScene(data) {
        this.currentSceneId = id();
        this.sceneCount++;

        this.post(data, 'init-scene', {
            time: new Date(),
            sessionId: this.SESSION_ID,
            sceneId: this.currentSceneId,
            sceneName: `scene-${this.sceneCount.toString().padStart(2, '0')}`
        });
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

        // does not use the buffer because this only happens once
        this.post(data, 'session', {
            sessionId: this.SESSION_ID
        });
    }
    
    log(data) {
        this.push(data);
    }

    logRobot(t, fsm, robot, eePose, target) {
        // const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        // const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        // const gripperDistance = pos1.distanceTo(pos2);

        // const row = [
        //     t, 
        //     this.SESSION_ID, 
        //     robot.robotName, 
        //     fsm.state
        // ];
        // for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
        //     const currJoint = robot.joints[joint];
        //     row.push(currJoint.jointValue[0]);
        // }
        // row.push(gripperDistance);
        // row.push(`${eePose.posi.x} ${eePose.posi.y} ${eePose.posi.z}`);
        // row.push(`${eePose.ori.x} ${eePose.ori.y} ${eePose.ori.z} ${eePose.ori.w}`);
        // row.push(`${target.position.x} ${target.position.y} ${target.position.z}`)
        // row.push(`${target.quaternion.x} ${target.quaternion.y} ${target.quaternion.z} ${target.quaternion.w}`)
        // this.push(row, 'robot');
    }

    logUser(t, camera, controller1, controller2, hand) {
        // const worldDirection = new T.Vector3();
        // camera.getWorldDirection(worldDirection);

        // this.push([
        //     t, 
        //     this.SESSION_ID,
        //     `${camera.position.x} ${camera.position.y} ${camera.position.z}`,
        //     `${camera.quaternion.x} ${camera.quaternion.y} ${camera.quaternion.z} ${camera.quaternion.w}`,
        //     `${worldDirection.x} ${worldDirection.y} ${worldDirection.z}`,
        //     `${controller1.position.x} ${controller1.position.y} ${controller1.position.z}`,
        //     `${controller1.quaternion.x} ${controller1.quaternion.y} ${controller1.quaternion.z} ${controller1.quaternion.w}`,
        //     `${controller2.position.x} ${controller2.position.y} ${controller2.position.z}`,
        //     `${controller2.quaternion.x} ${controller2.quaternion.y} ${controller2.quaternion.z} ${controller2.quaternion.w}`,
        //     hand,
        // ], 'user');
    }

    logTask(t, task) {
        // this.push([
        //     t, 
        //     this.SESSION_ID, 
        //     task.id,
        //     task.name,
        //     task.startTime
        // ], table);
    }
}
