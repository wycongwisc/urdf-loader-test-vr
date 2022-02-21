/**
 * @author William Cong 
 */

import * as T from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// import { degToRad, getCurrEEpose, mathjsMatToThreejsVector3 } from './utils';
import { rotQuaternion, getCurrEEpose, changeReferenceFrame, relToAbs, absToRel } from './utils';
import StateMachine from 'javascript-state-machine';
import { isZero } from 'mathjs';
import { Vector3 } from 'three';
import TeleportVR from 'teleportvr'


export class VrControl {
    constructor(params) {

        this.relaxedIK = params.relaxedIK;
        this.renderer = params.renderer;
        this.scene = params.scene;
        this.teleportVR = params.teleportVR;
        this.intervalID = undefined;
        this.controlMapping = params.controlMapping;
        const uiControl = params.uiControl;
        this.target_cursor = params.target_cursor;
        this.robotInfo = params.robot_info;

        this.lastSqueeze = 0;
        this.defaultPosition = new T.Vector3();
        this.defaultPosition.set(1.5, 1.5, 0)

        this.init_ee_abs_three = getCurrEEpose();
        this.ee_goal_rel_three = {"posi": new T.Vector3(),
        "ori": new T.Quaternion().identity()};

        this.ee_goal_rel_ros = {"posi": new T.Vector3(),
                                "ori": new T.Quaternion().identity()};
        
        // transformation from ROS' reference frame to THREE's reference frame
        this.T_ROS_to_THREE = new T.Matrix4().makeRotationFromEuler(new T.Euler(1.57079632679, 0., 0.));
        // transformation from THREE' reference frame to ROS's reference frame
        this.T_THREE_to_ROS= this.T_ROS_to_THREE.clone().invert();

        this.EE_OFFSET_INDICATOR = undefined;


        this.controller = this.renderer.xr.getController(0); 
        this.controllerGrip = this.renderer.xr.getControllerGrip(0);
        const controllerModelFactory = new XRControllerModelFactory()
        this.model = controllerModelFactory.createControllerModel(this.controllerGrip);
        this.controllerGrip.add(this.model);

        this.scene.add( this.controllerGrip );

        this.select = this.select.bind(this);
        this.squeeze = this.squeeze.bind(this);

        this.controller.addEventListener('select', this.select.bind(this));
        this.controller.addEventListener('squeeze', this.squeeze.bind(this))

        this.controllerGrip.addEventListener('connected', e => {
            this.teleportVR.add(0, this.controllerGrip, e.data.gamepad)
        })



        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'activateDragControl', from: 'IDLE', to: 'DRAG_CONTROL' },
                { name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' },
                { name: 'deactivateDragControl', from: 'DRAG_CONTROL', to: 'IDLE' },
                { name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' },
                { name: 'goto', from: '*', to: function(s) { return s } }
            ],
            data: {
                dragTimeout: false,
            },
            methods: {
            }
        })

        let stereoToggle = document.querySelector('#stereo-toggle');
        stereoToggle.addEventListener('click', (e) => {
            this.renderer.xr.stereo = e.target.checked
        })

        let parallaxToggle = document.querySelector('#parallax-toggle');
        parallaxToggle.addEventListener('click', (e) => {
            this.renderer.xr.parallax = e.target.checked;
            this.renderer.xr.defaultPosition = this.defaultPosition;
        })
        
    }

    squeeze() {
        if (Math.abs(Date.now() - this.lastSqueeze) > 300) {
            this.reset()
        } else {
            this.renderer.xr.stereo = !this.renderer.xr.stereo
            console.log('Stereo: ' +  this.renderer.xr.stereo)
        }
        this.lastSqueeze = Date.now()
    }

    select() {

        switch(this.state.state) {
            case 'IDLE':
                this.state.activateRemoteControl();
                break;
            case 'REMOTE_CONTROL':
                this.state.deactivateRemoteControl();
                break;
            case 'DRAG_CONTROL':
                this.state.deactivateDragControl();
                this.state.dragTimeout = true;
                this.reset();
                break;
            default:
                break;
        }
    }

    reset() {
        this.scene.remove(this.EE_OFFSET_INDICATOR);
        this.state.goto('IDLE');
        this.relaxedIK.recover_vars([]);
        this.ee_goal_rel_three = {"posi": new T.Vector3(),
                                "ori": new T.Quaternion().identity()};
    }

    step() {

        const curr_ee_abs_three  = getCurrEEpose();
        const ctrlPose = this.getPose(this.controller)
        const prevCtrlPose = this.prevCtrlPose;
        this.prevCtrlPose = ctrlPose;

        const init_ee_abs_three = this.init_ee_abs_three;

        if (this.state.is('IDLE') && this.state.dragTimeout === false) {

            if (ctrlPose.posi.distanceTo(curr_ee_abs_three.posi) <= 0.1) {
                this.state.activateDragControl();
                return false;
            }

        } else if (this.state.is('IDLE') && this.state.dragTimeout === true) {
            
            this.state.dragTimeout = false;

        } else if (this.state.is('REMOTE_CONTROL')) {

            const deltaPosi = new T.Vector3(); 
            deltaPosi.subVectors(ctrlPose.posi, prevCtrlPose.posi)
            this.ee_goal_rel_three.posi.add(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(ctrlPose.ori.clone(), prevCtrlPose.ori.clone().invert())
            this.ee_goal_rel_three.ori.premultiply(deltaOri)

        } else if (this.state.is('DRAG_CONTROL')) { 

            const deltaPosi = new Vector3();
            deltaPosi.subVectors(ctrlPose.posi, init_ee_abs_three.posi)
            this.ee_goal_rel_three.posi.copy(deltaPosi);

            const deltaOri = new T.Quaternion();
            deltaOri.multiplyQuaternions(ctrlPose.ori.clone(), prevCtrlPose.ori.clone().invert())
            this.ee_goal_rel_three.ori.premultiply(deltaOri)
            
        }

        let ee_goal_rel_three = this.ee_goal_rel_three;
        let ee_goal_rel_ros = changeReferenceFrame(ee_goal_rel_three, this.T_ROS_to_THREE);
        let ee_goal_abs_three = relToAbs(ee_goal_rel_three, init_ee_abs_three);

        this.target_cursor.position.copy( ee_goal_abs_three.posi );
        this.target_cursor.matrixWorldNeedsUpdate = true;

        if (!this.state.is('IDLE')) {
            this.updateEEOffsetIndicator(curr_ee_abs_three.posi, ee_goal_abs_three.posi);
        }

        // distance difference
        let d = curr_ee_abs_three.posi.distanceTo( ee_goal_abs_three.posi  );
        // angle difference
        let a = curr_ee_abs_three.ori.angleTo( ee_goal_abs_three.ori );

        if ( d > 1e-3 || a > 1e-3 ) {
            const res = this.relaxedIK.solve ([
                ee_goal_rel_ros.posi.x,
                ee_goal_rel_ros.posi.y,
                ee_goal_rel_ros.posi.z],
                [ee_goal_rel_ros.ori.w, ee_goal_rel_ros.ori.x, ee_goal_rel_ros.ori.y, ee_goal_rel_ros.ori.z]);
            
            const jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach( joint => {
                const i = this.robotInfo.joint_ordering.indexOf(joint[0]);
                if (i != -1) {
                    window.robot.setJointValue(joint[0],  res[i]);
                }
            })   
            return true;
        }
        return false;
    }

    /**
     * 
     * @param {T.Vector3} start 
     * @param {T.Vector3} end 
     * @returns 
     */
    updateEEOffsetIndicator(start, end) {
        this.scene.remove(this.EE_OFFSET_INDICATOR);

        let color; 
        if (start.distanceTo(end) < 0.1) {
            color = 0xffffff;
        } else if (start.distanceTo(end) < .2) {
            color = 0xffcc00
        } else if (start.distanceTo(end) < .3) {
            color = 0xff0000;
        } else {
            this.scene.remove(this.EE_OFFSET_INDICATOR);
            this.state.goto('IDLE');
            return;
        }

        this.EE_OFFSET_INDICATOR = new T.Line(new T.BufferGeometry().setFromPoints([
            start,
            end
        ]), new T.LineBasicMaterial({
            color,
        }))

        this.scene.add(this.EE_OFFSET_INDICATOR);
    }

    getPose(controller) {
        return { 
            "posi": controller.getWorldPosition(new T.Vector3()),
            "ori": controller.getWorldQuaternion(new T.Quaternion()),
        } 
    }
}

