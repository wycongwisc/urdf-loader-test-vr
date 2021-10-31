/**
 * @author William Cong 
 */

import * as T from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { degToRad, getCurrEEpose, mathjsMatToThreejsVector3 } from './utils';


export class VrControl {
    constructor(options) {

        this.relaxedIK = options.relaxedIK
        this.renderer = options.renderer
        this.scene = options.scene
        this.intervalID = undefined;
        this.mouseControl = options.mouseControl
        this.controlMapping = options.controlMapping;
        this.scale = 10000
        this.worldToRobot = new T.Matrix4();
        this.worldToRobot.set(1, 0, 0, 0,
                              0, 0, -1, 0,
                              0, 1, 0, 0, 
                              0, 0, 0, 1)

        this.controlMode = false;

        this.controller1 = this.renderer.xr.getController(0); 
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        const controllerModelFactory = new XRControllerModelFactory()
        this.model1 = controllerModelFactory.createControllerModel(this.controllerGrip1);
        this.controllerGrip1.add(this.model1);

        this.scene.add( this.controllerGrip1 );

        this.select = this.select.bind(this);

        this.controller1.addEventListener('select', this.select.bind(this));
        
    }

    select() {
        if (this.controlMode) {
            this.controlMode = false;
            clearInterval(this.intervalID);
        } else {
            this.controlMode = true;
            let prev = this.getPose(this.controller1)
            this.intervalID = setInterval(() => {
                let curr = this.getPose(this.controller1)

                let x = (curr.x - prev.x) * this.scale
                let y = (curr.y - prev.y) * (this.scale / 80)
                let z = (curr.z - prev.z) * this.scale
                let r = new T.Quaternion();
                let q1 = prev.r.clone()
                let q2 = curr.r.clone()
                r.multiplyQuaternions(q2, q1.invert())

                // console.log('Previous orientation')
                // console.log(prev.r)
                // console.log('Current orientation')
                // console.log(curr.r)
                // console.log('Computed difference')
                // console.log(r)

                // in world space, y is up; in robot space, z is up
                this.mouseControl.onControllerMove(x, z, y, r, this.worldToRobot)
                
                prev = curr
            }, 5); 
        }
    }

    getPose(controller) {
        let controllerPos = controller.getWorldPosition(new T.Vector3())
        let controllerOri = controller.getWorldQuaternion(new T.Quaternion())
        return {
            x: controllerPos.x, 
            y: controllerPos.y,
            z: controllerPos.z,
            r: controllerOri
        } 
    }
}

