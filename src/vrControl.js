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
        this.test = 1

        this.controller1 = this.renderer.xr.getController(0); 
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        const controllerModelFactory = new XRControllerModelFactory()
        this.model1 = controllerModelFactory.createControllerModel(this.controllerGrip1);
        this.controllerGrip1.add(this.model1);

        this.scene.add( this.controllerGrip1 );

        this.squeezeStart = this.squeezeStart.bind(this);
        this.squeezeEnd = this.squeezeEnd.bind(this);
        this.controller1.addEventListener('squeezestart', this.squeezeStart.bind(this));
        this.controller1.addEventListener('squeezeend', this.squeezeEnd.bind(this));
    }

    squeezeStart() {
        let controllerPos = this.controller1.getWorldPosition(new T.Vector3(0, 0, 0))
        let prevX = controllerPos.x * 5000
        let prevY = controllerPos.z * 5000

        this.intervalID = setInterval(() => {
            controllerPos = this.controller1.getWorldPosition(new T.Vector3(0, 0, 0))
            let currX = controllerPos.x * 5000
            let currY = controllerPos.z * 5000

            let x = currX - prevX
            let y = currY - prevY

            this.mouseControl.onControllerMove(x, y)
            
            prevX = currX
            prevY = currY

            // let step = mathjsMatToThreejsVector3(this.controlMapping.transform([
            //         x * this.moveTransScale,
            //         -y * this.moveTransScale, 
            //         0]));
            // console.log(step)
            // this.mouseControl.ee_goal_rel_ros.posi.add( step );
        }, 5);
    }

    squeezeEnd() {
        console.log("end")
        clearInterval(this.intervalID);
    }
}

