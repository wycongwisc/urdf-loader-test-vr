/**
 * @author William Cong 
 */

import * as T from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { getCtrlPose, getCurrEEPose, updateTargetCursor, resetRobot, updateRobot } from './utils';
import StateMachine from 'javascript-state-machine';
import TeleportVR from './utilities/teleportvr';
import { Record } from './modules/Record';
import { DragControl } from './modules/DragControl';
import { RemoteControl } from './modules/RemoteControl';
import { Tasks } from './modules/Tasks';
import PickAndPlace from './modules/tasks/PickAndPlace';
import PoseMatch from './modules/tasks/PoseMatch';
import CustomTask from './modules/tasks/CustomTask';
import { ResetRobot } from './modules/ResetRobot';

export class VrControl {
    constructor(params) {

        // constants and params
        const that = this;
        const INIT_POSITION = new T.Vector3(0.25, 0, 0.5); // initial position of user after entering VR
        const INIT_HAND = 'left'; // initial hand used to control robot

        this.camera = params.camera;
        this.renderer = params.renderer;
        this.data = params.data;
        this.ui = params.ui;

        // initial end effector pose

        window.initEEAbsThree = getCurrEEPose();
        window.goalEERelThree = { 'posi': new T.Vector3(), 'ori': new T.Quaternion().identity() };
        
        // target cursor
        const targetCursor = new T.Mesh(new T.SphereGeometry( 0.015, 32, 32 ), new T.MeshBasicMaterial({ color: 0xFFFFFF }));
        targetCursor.renderOrder = Infinity;
        targetCursor.material.depthTest = false;
        targetCursor.material.depthWrite = false;
        window.scene.add(targetCursor);
        window.targetCursor = targetCursor;
        updateTargetCursor();

        // controllers

        const controllerModelFactory = new XRControllerModelFactory(); 
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1); 
        this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        this.controllerGrip1.add(controllerModelFactory.createControllerModel(this.controllerGrip1));  
        this.controllerGrip2.add(controllerModelFactory.createControllerModel(this.controllerGrip2));  
        window.scene.add(this.controller1);
        window.scene.add(this.controller2);
        window.scene.add(this.controllerGrip1);
        window.scene.add(this.controllerGrip2);
        this.controller = this.controller1;
        window.controllerGrip = this.controllerGrip1;

        // teleportvr

        this.teleportvr = new TeleportVR(window.scene, this.camera);
        this.teleportvr.setControlState(this.fsm);
        this.renderer.xr.addEventListener('sessionstart', () => this.teleportvr.set(INIT_POSITION));
        this.controllerGrip1.addEventListener('connected', e => {
            this.teleportvr.add(0, this.controllerGrip1, this.controller1, e.data.gamepad);
            this.controller1.handedness = e.data.handedness;
        });
        this.controllerGrip2.addEventListener('connected', e => {
            this.teleportvr.add(1, this.controllerGrip2, this.controller2, e.data.gamepad);
            this.controller2.handedness = e.data.handedness;
        });
        this.hand = INIT_HAND;

        // raycasters

        this.raycaster = new T.Raycaster();
        this.ray = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(0, 0, 0), 300, 0xFFFFFF, 1, 1);
        
        // modules

        const eventConfig = {
            squeeze: [],
            select: [
                () => {
                    if (this.fsm.is('IDLE')) {
                        if (this.ui.update(this.raycaster, false)) {
                            this.ui.update(this.raycaster, true);
                            return true;
                        }
                    }
                }
            ]
        };

        const fsmConfig = {
            init: 'IDLE',
            transitions: [
                { name: 'goto', from: '*', to: function(s) { return s } }
            ],
            methods: {
                onTransition: function(state) {
                    if (state.to !== 'IDLE') window.scene.remove(that.ray);
                }
            }
        };

        window.modules = [];
        const resetRobot = new ResetRobot({ eventConfig, ui: this.ui }, { showInstructions: true });
        window.modules.push(resetRobot)

        const dragControl = new DragControl({ fsmConfig, eventConfig, ui: this.ui }, { showInstructions: true })
        window.modules.push(dragControl);

        const remoteControl = new RemoteControl({ fsmConfig, eventConfig, ui: this.ui }, { showInstructions: true })
        window.modules.push(remoteControl);

        const record = new Record({ fsmConfig, eventConfig, ui: this.ui });
        window.modules.push(record);

        const tasks = new Tasks(
            { ui: this.ui }, 
            [   
                new CustomTask(
                    { ui: this.ui, data: this.data }, 
                    { disableModules: ['RemoteControl'], completeCondition: () => { return (dragControl.showInstructions === false) } }
                ),
                new CustomTask(
                    { ui: this.ui, data: this.data }, 
                    { disableModules: ['DragControl'], completeCondition: () => { return (remoteControl.showInstructions === false) } }
                ),
                new PickAndPlace(
                    { ui: this.ui, data: this.data }, 
                    { numRounds: 1 }
                ),
                new PoseMatch(
                    { ui: this.ui, data: this.data },
                    { numRounds: 1 }
                ),
            ],
            { navigation: true }
        )
        window.modules.push(tasks);
        // disable by reconstructing everything

        this.fsm = new StateMachine(fsmConfig);
        window.modules.forEach((module) => {
            if (module instanceof Record 
                || module instanceof DragControl 
                || module instanceof RemoteControl)
            module.setFSM(this.fsm)
        });

        tasks.start();

        //

        this.controller.addEventListener('squeeze', () => {
            for (const handler of eventConfig['squeeze']) {
                if (handler()) return;
            }
        });
        this.controller.addEventListener('select', () => {
            for (const handler of eventConfig['select']) {
                if (handler()) return;
            }
        });

        // ui

        function setHand(hand) {
            this.controller.removeEventListener('select', select);
            this.controller.removeEventListener('squeeze', squeeze);
            this.controller = (hand === this.controller1.handedness) ? this.controller1 : this.controller2;
            window.controllerGrip = (hand === this.controller1.handedness) ? this.controllerGrip1 : this.controllerGrip2;
            this.controller.addEventListener('select', select);
            this.controller.addEventListener('squeeze', squeeze);
            
            this.hand = hand;
        }

        // this.ui.addButtons(
        //     this.ui.CONTROLLER_SWITCH_PANEL,
        //     [
        //         { name: 'Left Hand', onClick: () => setHand('left') },
        //         { name: 'Right Hand', onClick: () => setHand('right') },
        //     ]
        // )
        // this.ui.addButtons(
        //     this.ui.REFRESH_PANEL,
        //     [
        //         { name: 'Refresh', onClick: () => window.location.reload() }
        //     ]
        // )
    }


    // this method needs to be cleaned up a bit
    update(t) {
        this.ctrlPose = getCtrlPose();
        this.currEEAbsThree = getCurrEEPose();

        // FIX: have control modes hide the ray 

        if (this.fsm.is('PLAYBACK') || this.fsm.is('IDLE')) {
            this.raycaster.set(this.ctrlPose.posi, this.controller.getWorldDirection(new T.Vector3()).negate());
            this.ray.position.copy(this.raycaster.ray.origin);
            this.ray.setDirection(this.raycaster.ray.direction);
            if (this.fsm.is('IDLE') && this.ray.parent !== window.scene) {
                window.scene.add(this.ray);
            }
            this.ui.update(this.raycaster);
        }

        for (const module of window.modules) {
            if (module.update(t, { 
                ctrlPose: this.ctrlPose, 
                prevCtrlPose: this.prevCtrlPose, 
                currEEAbsThree: this.currEEAbsThree, 
            })) return;
        }

        updateTargetCursor();
        updateRobot();

        this.prevCtrlPose = {...this.ctrlPose};
    }

    log(timestamp) {
        // const camera = this.camera;
        // const control1 = this.controllerGrip1;
        // const control2 = this.controllerGrip2;
        // const targetCursor = this.targetCursor;

        // const worldDirection = new T.Vector3();
        // camera.getWorldDirection(worldDirection);

        // this.data.push([
        //     timestamp, 
        //     `${camera.position.x} ${camera.position.y} ${camera.position.z}`,
        //     `${camera.quaternion.x} ${camera.quaternion.y} ${camera.quaternion.z} ${camera.quaternion.w}`,
        //     `${worldDirection.x} ${worldDirection.y} ${worldDirection.z}`,
        //     `${control1.position.x} ${control1.position.y} ${control1.position.z}`,
        //     `${control1.quaternion.x} ${control1.quaternion.y} ${control1.quaternion.z} ${control1.quaternion.w}`,
        //     `${control2.position.x} ${control2.position.y} ${control2.position.z}`,
        //     `${control2.quaternion.x} ${control2.quaternion.y} ${control2.quaternion.z} ${control2.quaternion.w}`,
        // ], 'user');

        // const row = [timestamp, window.currentRobot, this.fsm.state];
        // for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
        //     const currJoint = window.robot.joints[joint];
        //     row.push(currJoint.jointValue[0]);
        // }
        // row.push(`${targetCursor.position.x} ${targetCursor.position.y} ${targetCursor.position.z}`)
        // row.push(`${targetCursor.quaternion.x} ${targetCursor.quaternion.y} ${targetCursor.quaternion.z} ${targetCursor.quaternion.w}`)

        // this.data.push(row, 'robot');
    }
}

