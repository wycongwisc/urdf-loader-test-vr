/**
 * @author William Cong 
 */

import * as T from 'three';
import { getCurrEEPose, updateTargetCursor, resetRobot, updateRobot } from './utils';
import StateMachine from 'javascript-state-machine';
import TeleportVR from './utilities/teleportvr';
import { Record } from './modules/Record';
import { DragControl } from './modules/DragControl';
import { RemoteControl } from './modules/RemoteControl';
import { Tasks } from './modules/Tasks';
import PickAndPlace from './modules/tasks/PickAndPlace';
import PoseMatch from './modules/tasks/PoseMatch';
import CustomTask from './modules/tasks/CustomTask';
import PickAndDrop from './modules/tasks/PickAndDrop';
import { ResetRobot } from './modules/ResetRobot';
import { Teleport } from './modules/Teleport';
import { Grasping } from './modules/Grasping';
import DragControlTutorial from './modules/tasks/DragControlTutorial';
import RemoteControlTutorial from './modules/tasks/RemoteControlTutorial';
import GraspingTutorial from './modules/tasks/GraspingTutorial';
import Stack from './modules/tasks/Stack';
import Controllers from './utilities/Controllers'
import ControlStack from './modules/tasks/ControlStack';
import ControlPoseMatch from './modules/tasks/ControlPoseMatch';
import Table from './modules/tasks/objects/Table';

export default class Control {
    static async init(params) {

        const control = new Control();

        // constants and params
        const INIT_POSITION = new T.Vector3(0.25, 0, 0.5); // initial position of user after entering VR

        control.camera = params.camera;
        control.renderer = params.renderer;
        control.data = params.data;
        control.ui = params.ui;
        control.world = params.world;

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

        control.teleportvr = new TeleportVR(window.scene, control.camera);
        control.controller = new Controllers(control.renderer, control.teleportvr);
        // teleportvr

        control.renderer.xr.addEventListener('sessionstart', () => control.teleportvr.set(INIT_POSITION));

        // raycasters

        control.raycaster = new T.Raycaster();
        control.ray = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(0, 0, 0), 300, 0xFFFFFF, 1, 1);
        
        // modules

        control.controller.addButtonAction('trigger', 'ui-select', () => {
            if (window.fsm.is('IDLE')) {
                if (control.ui.update(control.raycaster, false)) {
                    control.ui.update(control.raycaster, true);
                    return true;
                }
            }
        })

        const fsmConfig = {
            init: 'IDLE',
            transitions: [
                { name: 'goto', from: '*', to: function(s) { return s } }
            ],
            methods: {
                onTransition: (state) => {
                    if (state.to !== 'IDLE') window.scene.remove(control.ray);
                    if (state.to === 'IDLE') {
                        control.controller.get().grip.traverse((child) => { if (child instanceof T.Mesh) child.visible = true });

                    }
                }
            }
        };

        window.modules = [];

        const teleport = new Teleport(control.teleportvr);
        window.modules.push(teleport);

        // const resetRobot = new ResetRobot({ eventConfig, ui: this.ui }, { showInstructions: true });
        // window.modules.push(resetRobot)

        // const dragControl = new DragControl({ fsmConfig, ui: this.ui, controller: this.controller })
        // window.modules.push(dragControl);

        const remoteControl = new RemoteControl({ fsmConfig, ui: control.ui, controller: control.controller })
        window.modules.push(remoteControl);

        const grasping = new Grasping(control.controller, { mode: 'trigger-hold' });
        window.modules.push(grasping);

        // const record = new Record({ fsmConfig, eventConfig, ui: this.ui });
        // window.modules.push(record);

        const text = () => {
            return [
                control.ui.createText(`Drag Control: ${dragControl.disabled ? 'disabled' : dragControl.mode}\n`),
                control.ui.createText(`${dragControl.disabled ? '' : dragControl.modeInstructions + '\n'}\n`, { fontSize: 0.03 }),
                control.ui.createText(`Remote Control: ${remoteControl.disabled ? 'disabled' : remoteControl.mode}\n`),
                control.ui.createText(`${remoteControl.disabled ? '' : remoteControl.modeInstructions + '\n'}\n`, { fontSize: 0.03 }),
                control.ui.createText(`Grasping: ${grasping.disabled ? 'disabled' : grasping.mode}\n`),
                control.ui.createText(`${grasping.disabled ? '' : grasping.modeInstructions + '\n'}\n`, { fontSize: 0.03 }),
            ];
        }

        let tasks = new Tasks(
            { ui: control.ui, data: control.data }, 
            [   
                await Stack.init(
                    { ui: control.ui, data: control.data, world: control.world, controller: control.controller },
                    { numRounds: 1 }
                )
            ],
            { navigation: true }
        )

        document.querySelector('#set-task').addEventListener('click', () => {

            tasks.stop();

            const task = document.querySelector('#task').value;
            const dragControlMode = document.querySelector('#drag-control').value;
            const remoteControlMode = document.querySelector('#remote-control').value;
            const graspingMode = document.querySelector('#grasping').value;

            console.log(remoteControlMode)

            const disableModules = [];
            if (dragControlMode === 'disabled') disableModules.push('drag-control');
            if (remoteControlMode === 'disabled') disableModules.push('remote-control');
            if (graspingMode === 'disabled') disableModules.push('grasping');

            const initConfig = () => {
                if (dragControlMode !== 'disabled') dragControl.setMode(dragControlMode);
                if (remoteControlMode !== 'disabled') remoteControl.setMode(remoteControlMode);
                if (graspingMode !== 'disabled') grasping.setMode(graspingMode);
            }

            let customTask;
            switch(task) {
                case 'stack':
                    customTask = new Stack(
                        { ui: control.ui, data: control.data, world: control.world, controller: control.controller },
                        { numRounds: 1, disableModules, initConfig, text }
                    )
                    break;
                case 'pose-match':
                    customTask = new PoseMatch(
                        { ui: control.ui, data: control.data },
                        { numRounds: 1, disableModules, initConfig, text }
                    )
                    break;
                case 'pick-and-place':
                    customTask = new PickAndPlace(
                        { ui: control.ui, data: control.data, world: control.world },
                        { numRounds: 1, disableModules, initConfig, text }
                    );
                    break;
                default:
                    break;
            }
            
            tasks = new Tasks(
                { ui: control.ui, data: control.data },
                [ customTask ]
            )

            window.modules.pop();
            window.modules.push(tasks);
        })


        window.modules.push(tasks);

        window.fsm = new StateMachine(fsmConfig);
        window.modules.forEach((module) => {
            if (
                module instanceof Record 
                || module instanceof DragControl 
                || module instanceof RemoteControl
                || module instanceof Teleport
                || module instanceof ResetRobot
            )
            module.setFSM(window.fsm)
        });

        tasks.start();


        control.renderer.xr.addEventListener('sessionstart', async () => {
            await control.data.initSession();
            // tasks.start();
        })

        return control;
    }

    constructor(params) {
    }

    update(t) {
        this.ctrlPose = this.controller.getPose();
        this.currEEAbsThree = getCurrEEPose();

        // TODO: have control modes hide the ray 
        // if (window.fsm.is('PLAYBACK') || window.fsm.is('IDLE')) {
        //     this.raycaster.set(this.ctrlPose.posi, this.controller.getDirection());
        //     this.ray.position.copy(this.raycaster.ray.origin);
        //     this.ray.setDirection(this.raycaster.ray.direction);
        //     if (window.fsm.is('IDLE') && this.ray.parent !== window.scene) {
        //         window.scene.add(this.ray);
        //     }
        //     this.ui.update(this.raycaster);
        // }

        for (const module of window.modules) {
            if (module.update(t, { 
                ctrlPose: this.ctrlPose, 
                prevCtrlPose: this.prevCtrlPose, 
                currEEAbsThree: this.currEEAbsThree, 
            })) return;
        }

        this.controller.update();
        updateTargetCursor();
        updateRobot();

        this.prevCtrlPose = {...this.ctrlPose};
    }

    log(t) {
        this.data.logRobot(t, window.fsm, window.robot, getCurrEEPose(), window.targetCursor);
        this.data.logUser(t, this.camera, this.controller.get('left').grip, this.controller.get('right').grip, this.hand);

        for (const module of window.modules) {
            module.log(t);
        }
    }
}

