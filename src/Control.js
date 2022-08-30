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
import End from './modules/tasks/End';
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
import Condition from './Condition';
import InteractiveUI from './modules/InteractiveUI';

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
        control.ground = params.ground;

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


        const utilities = {
            data: control.data,
            ui: control.ui,
            world: control.world,
            controller: control.controller,
            camera: control.camera,
            ground: control.ground,
            onComplete: () => control.fsm.next()
        }

        control.tasks = [
            await DragControlTutorial.init(
                utilities,
                new Condition('drag-control-only', [
                    new DragControl(utilities, { controlMode: 'grip-toggle' })
                ])
            ),
            await GraspingTutorial.init(
                utilities,
                new Condition('drag-control-only', [
                    new DragControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ])
            ),
            await PickAndDrop.init(
                utilities,
                new Condition('drag-control-only', [
                    new DragControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ]),
                { numRounds: 2, text: 'Use drag control to pick up the blocks and place them in the box. Once every block is in the box, complete the task by closing the lid.\n\n' }
            ),
            await Stack.init(
                utilities,
                new Condition('drag-control-only', [
                    new DragControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ]),
                { numRounds: 2, text: 'Use drag control to stack the blocks in any order. To complete the task, make sure the stack does not tip over.\n\n' }
            ),
            await RemoteControlTutorial.init(
                utilities,
                new Condition('remote-control-only', [
                    new RemoteControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ])
            ),
            await PickAndDrop.init(
                utilities,
                new Condition('remote-control-only', [
                    new RemoteControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ]),
                { numRounds: 2, text: 'Use remote control to pick up the blocks and place them in the box. Once every block is in the box, complete the task by closing the lid.\n\n' }
            ),
            await Stack.init(
                utilities,
                new Condition('remote-control-only', [
                    new RemoteControl(utilities, { controlMode: 'grip-toggle' }),
                    new Grasping(utilities, { controlMode: 'trigger-toggle' }),
                ]),
                { numRounds: 2, text: 'Use remote control to stack the blocks in any order. To complete the task, make sure the stack does not tip over.\n\n' }
            ),
            await End.init(
                utilities,
                new Condition('remote-control-only', [
                    new RemoteControl(utilities, { controlMode: 'grip-toggle' }),
                ]),
            )
        ]

        control.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { 
                    name: 'start', from: 'IDLE', to: '0'
                },
                { 
                    name: 'next', from: '*', to: function() {
                        return (Number(this.state) === control.tasks.length) ? 'IDLE' : `${Number(this.state) + 1}`;
                    }
                },
                { 
                    name: 'previous', from: '*', to: function() {
                        return (Number(this.state) === 0) ? 'IDLE' : `${Number(this.state) - 1}`;
                    }
                },
                { 
                    name: 'stop', from: '*', to: 'IDLE'
                },
            ],
            methods: {
                onStart: () => {
                    const task = control.tasks[0];
                    task.start();
                },
                onNext: (state) => {
                    // control.tasks[Number(state.from)].stop(); // stop the current task

                    console.log(state)

                    if (state.to === 'IDLE') {
                        window.location.reload(); 
                    } else {
                        control.tasks[Number(state.to)].start(); // start the next task
                    }
                }
            }
        })

        control.renderer.xr.addEventListener('sessionstart', async () => {
            await control.data.initSession();
            control.fsm.start();
        })

        control.controller.get('left').controller.addEventListener('select', () => {
            console.log('remote reset')
            control.tasks[Number(control.fsm.state)].fsm.reset();
        })

        return control;
    }

    constructor(params) {
    }

    update(t) {
        const state = {
            ctrlPose: this.controller.getPose(),
            currEEAbsThree: getCurrEEPose(),
            prevCtrlPose: this.prevCtrlPose,
        }

        if (this.fsm.state !== 'IDLE') {
            const task = this.tasks[Number(this.fsm.state)];
            task.update(Date.now(), state);
            task.log(Date.now());
        }

        this.controller.update();
        updateTargetCursor();
        updateRobot();
        
        this.prevCtrlPose = {...state.ctrlPose};
    }

    log(t) {
    }
}

