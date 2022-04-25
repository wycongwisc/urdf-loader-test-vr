/**
 * @author William Cong 
 */

import * as T from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// import { degToRad, getCurrEEpose, mathjsMatToThreejsVector3 } from './utils';
import { rotQuaternion, getCurrEEpose, changeReferenceFrame, relToAbs, absToRel, threejsVector3ToMathjsMat } from './utils';
import StateMachine from 'javascript-state-machine';
import { OculusHandModel } from 'three/examples/jsm/webxr/OculusHandModel.js';
import { OculusHandPointerModel } from 'three/examples/jsm/webxr/OculusHandPointerModel.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { Vector3 } from 'three';


export class VrControl {
    constructor(params) {

        this.relaxedIK = params.relaxedIK;
        this.renderer = params.renderer;
        this.camera = params.camera;
        this.scene = params.scene;
        this.teleportVR = params.teleportVR;
        this.intervalID = undefined;
        this.controlMapping = params.controlMapping;
        this.targetCursor = params.targetCursor;
        this.robotInfo = params.robot_info;
        this.dataControl = params.dataControl;

        this.ui = params.uiControl;

        this.data = [];

        this.SPAWN_POSITION = [0.25, 0, 0.5];

        this.lastSqueeze = 0;
        this.init_ee_abs_three = getCurrEEpose();
        this.ee_goal_rel_three = {
            "posi": new T.Vector3(),
            "ori": new T.Quaternion().identity()
        };

        this.ee_goal_rel_ros = {
            "posi": new T.Vector3(),
            "ori": new T.Quaternion().identity()
        };
        
        // transformation from ROS' reference frame to THREE's reference frame
        this.T_ROS_to_THREE = new T.Matrix4().makeRotationFromEuler(new T.Euler(1.57079632679, 0., 0.));
        // transformation from THREE' reference frame to ROS's reference frame
        this.T_THREE_to_ROS= this.T_ROS_to_THREE.clone().invert();


        this.EE_OFFSET_INDICATOR = undefined;

        this.recordIndicator = new T.Mesh(
            new T.SphereGeometry( 0.05, 32, 32 ), 
            new T.MeshBasicMaterial({ color: 0xFF0000 }) 
        );
        this.recordIndicator.position.set(0, 1.65, 0);

        this.playbackIndicator = new T.Mesh( 
            new T.SphereGeometry( 0.05, 32, 32 ), 
            new T.MeshBasicMaterial({ color: 0x0000FF })
        );
        this.playbackIndicator.position.set(0, 1.65, 0);

        // this.workspaceCenter = [
        //     window.robot.position.x - .2, 
        //     window.robot.position.y + 1.35, 
        //     window.robot.position.z
        // ]
        // this.workspaceRadius = 1.2
        // this.workspaceIndicator = new T.Mesh( 
        //     new T.SphereGeometry( this.workspaceRadius, 32, 32 ), 
        //     new T.MeshBasicMaterial({ color: 0xFF0000, wireframe: true })
        // );
        // this.workspaceIndicator.position.set(...this.workspaceCenter);
        // this.scene.add(this.workspaceIndicator);

        // controller

        const controllerModelFactory = new XRControllerModelFactory();

        // controller 1
        this.controller1 = this.renderer.xr.getController(0); 
        this.scene.add(this.controller1);

        this.controller1Grip = this.renderer.xr.getControllerGrip(0);
        this.controller1Grip.add(controllerModelFactory.createControllerModel(this.controller1Grip));    
        this.scene.add(this.controller1Grip);

        this.controller1Grip.addEventListener('connected', e => {
            this.teleportVR.add(0, this.controller1Grip, this.controller1, e.data.gamepad);
        });

        this.controller2 = this.renderer.xr.getController(1); 
        this.scene.add(this.controller2);

        this.controller2Grip = this.renderer.xr.getControllerGrip(1);
        this.controller2Grip.add(controllerModelFactory.createControllerModel(this.controller2Grip));    
        this.scene.add(this.controller2Grip);

        this.controller2Grip.addEventListener('connected', e => {
            this.teleportVR.add(1, this.controller2Grip, this.controller2, e.data.gamepad);
            this.left = (e.data.handedness) === 'left' ? 2 : 1;
        });

        //

        this.teleportVR.setControlState(this.state);
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.teleportVR.set(...this.SPAWN_POSITION);
        })

        this.controller = this.controller1;
        this.controllerGrip = this.controller1Grip;

        this.select = this.select.bind(this);
        this.squeeze = this.squeeze.bind(this);

        this.controller.addEventListener('select', this.select);
        this.controller.addEventListener('squeeze', this.squeeze);

        // this.controllerGrip.addEventListener('connected', e => {
        //     this.teleportVR.add(0, this.controllerGrip, this.controller, e.data.gamepad, this.state);
        // })

        const that = this;

        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'activateDragControl', from: 'IDLE', to: 'DRAG_CONTROL' },
                { name: 'activateRemoteControl', from: 'IDLE', to: 'REMOTE_CONTROL' },
                { name: 'deactivateDragControl', from: 'DRAG_CONTROL', to: 'IDLE' },
                { name: 'deactivateRemoteControl', from: 'REMOTE_CONTROL', to: 'IDLE' },
                { name: 'activatePlayback', from: 'IDLE', to: 'PLAYBACK'}, 
                { name: 'deactivatePlayback', from: 'PLAYBACK', to: 'IDLE'}, 
                { name: 'goto', from: '*', to: function(s) { return s } }
            ],
            data: {
                dragTimeout: false,
                isRecording: false,
            },
            methods: {
                onActivateDragControl: function() {
                    console.log('here');
                    that.scene.remove(that.ray);
                    that.controllerGrip.traverse((child) => {
                        if (child instanceof T.Mesh) {
                            child.visible = false;
                        }
                    })
                },
                onActivateRemoteControl: function() {
                    that.scene.remove(that.ray);
                },
                onDeactivateDragControl: function() {
                    that.scene.add(that.ray);
                    that.controllerGrip.traverse((child) => {
                        if (child instanceof T.Mesh) {
                            child.visible = true;
                        }
                    })
                    that.targetCursor.material.color.setHex(0xFFFFFF);
                },
                onDeactivateRemoteControl: function() {
                    that.scene.add(that.ray);
                    that.targetCursor.material.color.setHex(0xFFFFFF);
                },
                onActivatePlayback: function() {
                    that.playbackData = JSON.parse(localStorage.getItem('recordData'));
                    that.scene.remove(
                        that.EE_OFFSET_INDICATOR,
                        that.targetCursor,
                        // that.ray
                    );

                    let blink = true;
                    that.playbackInterval = setInterval(() => {
                        if (blink) {
                            that.scene.add(that.playbackIndicator);
                        } else {
                            that.scene.remove(that.playbackIndicator);
                        }
                        blink = !blink;
                    }, 500)

                },
                onDeactivatePlayback: function() {
                    that.scene.add(that.EE_OFFSET_INDICATOR);
                    that.scene.add(
                        that.EE_OFFSET_INDICATOR,
                        that.targetCursor,
                        // that.ray
                    );
                    that.scene.remove(that.playbackIndicator);
                    clearInterval(that.playbackInterval);
                },
                onTransition: function(state) {
                    if (window.task?.disabledControlModes.includes(state.to)) return false;
                }
                
            }
        })

        // REMOVE THIS 
        localStorage.clear();
        
        this.raycaster = new T.Raycaster();
        this.ray = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(0, 0, 0), 300, 0xFFFFFF, 1, 1);
        
        this.ui.addButtons(
            this.ui.CONTROLLER_SWITCH_PANEL,
            [
                {
                    name: 'Left Hand',
                    onClick: () => {
                        this.controller.removeEventListener('select', this.select);
                        this.controller.removeEventListener('squeeze', this.squeeze);
                        this.controller = this.left === 1 ? this.controller1 : this.controller2;
                        this.controllerGrip = this.left === 1 ? this.controller1Grip : this.controller2Grip;
                        this.controller.addEventListener('select', this.select);
                        this.controller.addEventListener('squeeze', this.squeeze);
                    }
                },
                {
                    name: 'Right Hand',
                    onClick: () => {
                        this.controller.removeEventListener('select', this.select);
                        this.controller.removeEventListener('squeeze', this.squeeze);
                        this.controller = this.left === 2 ? this.controller1 : this.controller2;
                        this.controllerGrip = this.left === 2 ? this.controller1Grip : this.controller2Grip;
                        this.controller.addEventListener('select', this.select);
                        this.controller.addEventListener('squeeze', this.squeeze);
                    }
                },
            ]
        )

        this.ui.addButtons(
            this.ui.ROBOT_SWITCH_PANEL,
            [
                {
                    name: 'Sawyer',
                    onClick: () => {
                        if (this.state.is('IDLE')) {
                            if (window.currentRobot === 'sawyer') return;
                            
                            this.scene.remove(window.robot);
                            window.loadRobot(window.sawyerRobotFile);
                            window.currentRobot = 'sawyer'
                        }
                    }
                },
                {
                    name: 'ur5',
                    onClick: () => {
                        if (this.state.is('IDLE')) {
                            if (window.currentRobot === 'ur5') return;
                            
                            this.scene.remove(window.robot);
                            window.loadRobot(window.ur5RobotFile);
                            window.currentRobot = 'ur5'
                        }
                    }
                },
            ]
        )

        this.ui.addButtons(
            this.ui.REFRESH_PANEL,
            [
                {
                    name: 'Refresh',
                    onClick: () => {
                        window.location.reload();
                    }
                }
            ]
        )

        this.ui.addButtons(
            this.ui.RECORDING_PANEL,
            [
                {
                    name: 'Record',
                    onClick: () => {
                        if (this.state.is('IDLE')) {
                            this.playbackFrameIndex = 0;
                            this.state.isRecording = true;

                            let blink = true;
                            this.recordInterval = setInterval(() => {
                                if (blink) {
                                    this.scene.add(this.recordIndicator);
                                } else {
                                    this.scene.remove(this.recordIndicator);
                                }
                                blink = !blink;
                            }, 500)
                        }
                    }
                },
                {
                    name: 'Stop',
                    onClick: () => {
                        if (this.state.is('IDLE') && this.state.isRecording) {
                            this.scene.remove(this.recordIndicator);
                            clearInterval(this.recordInterval);

                            this.state.isRecording = false;
                            localStorage.setItem('recordData', JSON.stringify(this.recordData));
                            this.recordData = [];
                        }
                    }
                },
                {
                    name: 'Play',
                    onClick: () => {
                        if (this.state.is('IDLE') && !this.state.isRecording && localStorage.getItem('recordData')) {
                            this.state.activatePlayback();
                        } else if (this.state.is('PLAYBACK')) {
                            this.state.deactivatePlayback();
                        }
                    }
                }
            ]
        )

        this.recordData = [];
        this.playbackData = [];
        this.playbackFrameIndex = 0;
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
                if (this.ui.update(this.raycaster, false)) {
                    this.ui.update(this.raycaster, true);
                } else {
                    this.state.activateRemoteControl();
                }
                break;
            case 'REMOTE_CONTROL':
                this.state.deactivateRemoteControl();
                break;
            case 'DRAG_CONTROL':
                this.state.deactivateDragControl();
                this.state.dragTimeout = true;
                setTimeout(() => {
                    this.state.dragTimeout = false;
                }, 1000)
                this.scene.remove(this.EE_OFFSET_INDICATOR);
                //this.reset();
                break;
            default:
                break;
        }
    }

    reset() {
        this.scene.remove(this.EE_OFFSET_INDICATOR);
        this.state.goto('IDLE');
        this.relaxedIK.recover_vars([]);
        this.ee_goal_rel_three = {
            "posi": new T.Vector3(),
            "ori": new T.Quaternion().identity()
        };
    }

    // this method needs to be cleaned up a bit
    update() {
        const curr_ee_abs_three = getCurrEEpose();
        const ctrlPose = this.getControllerPose();
        const prevCtrlPose = this.prevCtrlPose;
        this.prevCtrlPose = ctrlPose;

        if (this.state.is('PLAYBACK') || this.state.is('IDLE')) {
            this.raycaster.set(ctrlPose.posi, this.controller.getWorldDirection(new T.Vector3()).negate());
            this.ray.position.copy(this.raycaster.ray.origin);
            this.ray.setDirection(this.raycaster.ray.direction);
            if (this.state.is('IDLE') && this.ray.parent !== this.scene) {
                this.scene.add(this.ray);
            }
            this.ui.update(this.raycaster);
        }

        if (this.state.is('PLAYBACK')) {
            console.log('playback')
            const jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach((joint, index) => {
                let jointInfo;
                if ((jointInfo = this.playbackData[this.playbackFrameIndex].find((e) => e[0] === index))) {
                    console.log(jointInfo)
                    // joint[1].jointValue[0] = jointInfo[1];
                    window.robot.setJointValue(joint[0],  jointInfo[1]);
                }
            })   
            if (this.playbackFrameIndex < this.playbackData.length - 1) {
                this.playbackFrameIndex++;
            } else {
                this.playbackFrameIndex = 0;
                this.state.deactivatePlayback();
            }
            return true;
        }

        // if (curr_ee_abs_three.posi.distanceTo(new T.Vector3(...this.workspaceCenter)) > this.workspaceRadius
        //     && this.workspaceIndicator.parent !== this.scene) {
        //     this.scene.add(this.workspaceIndicator);
        // } else if (curr_ee_abs_three.posi.distanceTo(new T.Vector3(...this.workspaceCenter)) < this.workspaceRadius
        //     && this.workspaceIndicator.parent === this.scene) {
        //     this.scene.remove(this.workspaceIndicator);
        // }

        const init_ee_abs_three = this.init_ee_abs_three;

        if (this.state.is('IDLE') && this.state.dragTimeout === false) {

            if (ctrlPose.posi.distanceTo(curr_ee_abs_three.posi) <= 0.1) {
                this.state.activateDragControl();
                return false;
            }

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

        this.targetCursor.position.copy( ee_goal_abs_three.posi );
        this.targetCursor.quaternion.copy( ee_goal_abs_three.ori );

        // if (!this.state.is('DRAG_CONTROL')) this.targetCursor.translateZ(.075);

        this.targetCursor.matrixWorldNeedsUpdate = true;

        if (!this.state.is('IDLE')) {
            this.updateEEOffsetIndicator(curr_ee_abs_three.posi, this.targetCursor.position);
        }

        // distance difference
        let d = curr_ee_abs_three.posi.distanceTo( ee_goal_abs_three.posi  );
        // angle difference
        let a = curr_ee_abs_three.ori.angleTo( ee_goal_abs_three.ori );

        let didJointsUpdate = false;
        if ( d > 1e-3 || a > 1e-3 ) {
            const res = this.relaxedIK.solve ([
                ee_goal_rel_ros.posi.x,
                ee_goal_rel_ros.posi.y,
                ee_goal_rel_ros.posi.z
            ], [ee_goal_rel_ros.ori.w, ee_goal_rel_ros.ori.x, ee_goal_rel_ros.ori.y, ee_goal_rel_ros.ori.z]);
            const jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach( joint => {
                const i = this.robotInfo.joint_ordering.indexOf(joint[0]);
                if (i != -1) {
                    window.robot.setJointValue(joint[0], res[i]);
                }
            })   
            didJointsUpdate = true;
        }

        if (this.state.isRecording) {
            const row = [];
            let jointArr = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            jointArr.forEach((joint, index) => {
                let i = this.robotInfo.joint_ordering.indexOf(joint[0]);
                if (i != -1) {
                    row.push([index, joint[1].jointValue[0]]);
                }
            }) 
            this.recordData.push(row);
        }
        return didJointsUpdate;
    }

    log(timestamp) {
        const camera = this.camera;
        const control1 = this.controller1Grip;
        const control2 = this.controller2Grip;

        const worldDirection = new T.Vector3();
        camera.getWorldDirection(worldDirection);

        this.dataControl.push([
            timestamp, 
            `${camera.position.x} ${camera.position.y} ${camera.position.z}`,
            `${camera.quaternion.x} ${camera.quaternion.y} ${camera.quaternion.z} ${camera.quaternion.w}`,
            `${worldDirection.x} ${worldDirection.y} ${worldDirection.z}`,
            `${control1.position.x} ${control1.position.y} ${control1.position.z}`,
            `${control1.quaternion.x} ${control1.quaternion.y} ${control1.quaternion.z} ${control1.quaternion.w}`,
            `${control2.position.x} ${control2.position.y} ${control2.position.z}`,
            `${control2.quaternion.x} ${control2.quaternion.y} ${control2.quaternion.z} ${control2.quaternion.w}`,
        ], 'user');
    }

    /**
     * 
     * @param {T.Vector3} start 
     * @param {T.Vector3} end 
     * @returns 
     */
    updateEEOffsetIndicator(start, end) {
        this.scene.remove(this.EE_OFFSET_INDICATOR);

        const length = start.distanceTo(end);

        let color; 
        if (length < 0.1) {
            color = 0x00FF00;
        } else if (length < 0.2) {
            color = 0xffcc00
        } else if (length < 0.3) {
            color = 0xff0000;
        } else {
            switch(this.state.state) {
                case 'DRAG_CONTROL':
                    this.state.deactivateDragControl();
                    break;
                case 'REMOTE_CONTROL':
                    this.state.deactivateRemoteControl();
                    break;
            }
            this.scene.remove(this.EE_OFFSET_INDICATOR);
            return;
        }

        this.EE_OFFSET_INDICATOR = new T.Line(
            new T.BufferGeometry().setFromPoints([start, end]), 
            new T.LineBasicMaterial({ transparent: true, opacity: 1, color })
        )
        this.targetCursor.material.color.setHex(color);

        this.scene.add(this.EE_OFFSET_INDICATOR);
    }

    getControllerPose() {
        return { 
            "posi": this.controllerGrip.getWorldPosition(new T.Vector3()),
            "ori": this.controllerGrip.getWorldQuaternion(new T.Quaternion()),
        } 
    }
}

