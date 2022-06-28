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
import { Teleport } from './modules/Teleport';

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

        this.controllerGrip1.addEventListener('connected', e => this.controller1.handedness = e.data.handedness);
        this.controllerGrip2.addEventListener('connected', e => this.controller2.handedness = e.data.handedness);
        this.hand = INIT_HAND;

        // teleportvr

        this.teleportvr = new TeleportVR(window.scene, this.camera);
        this.renderer.xr.addEventListener('sessionstart', () => this.teleportvr.set(INIT_POSITION));

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

        const teleport = new Teleport({ 
            teleportvr: this.teleportvr,
            controllerGrip1: this.controllerGrip1,
            controllerGrip2: this.controllerGrip2,
            controller1: this.controller1,
            controller2: this.controller2, 
        })
        window.modules.push(teleport);

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
                || module instanceof RemoteControl
                || module instanceof Teleport
                || module instanceof ResetRobot)
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

        // function setHand(hand) {
        //     this.controller.removeEventListener('select', select);
        //     this.controller.removeEventListener('squeeze', squeeze);
        //     this.controller = (hand === this.controller1.handedness) ? this.controller1 : this.controller2;
        //     window.controllerGrip = (hand === this.controller1.handedness) ? this.controllerGrip1 : this.controllerGrip2;
        //     this.controller.addEventListener('select', select);
        //     this.controller.addEventListener('squeeze', squeeze);
            
        //     this.hand = hand;
        // }

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

        this.data.logSession(window.modules);
    }

    update(t) {
        this.ctrlPose = getCtrlPose();
        this.currEEAbsThree = getCurrEEPose();

        // TODO: have control modes hide the ray 
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

    log(t) {
        this.data.logRobot(t, this.fsm, window.robot, window.targetCursor);
        this.data.logUser(t, this.camera, this.controllerGrip1, this.controllerGrip2, this.hand);

        for (const module of window.modules) {
            module.log(t);
        }
    }
}

