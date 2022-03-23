import PickAndPlace from "./tasks/PickAndPlace"
import PoseMatch from './tasks/PoseMatch'
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import ThreeMeshUI from 'three-mesh-ui'

export class TaskControl {
    constructor(params) {
        this.scene = params.scene
        this.camera = params.camera;
        this.gripper = params.gripper
        this.dataControl = params.dataControl;

        this.setState = this.setState.bind(this);

        const that = this;
        this.uiControl = params.uiControl;
        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: '1'},
                { name: 'next', from: ['1', '2'], to: function() {
                    return this.state === '2' ? 'IDLE' : `${Number(this.state) + 1}`
                }},
                { name: 'previous', from: ['1', '2'], to: function() {
                    return this.state === '1' ? 'IDLE' : `${Number(this.state) - 1}`
                }},
                { name: 'stop', from: ['1', '2'], to: 'IDLE'},
            ],
            methods: {
                onBeforeTransition: function () { 
                    that.task?.destruct()
                },
                onAfterTransition: function() {
                    that.uiControl.reset();
                    that.setState(this.state);
                }
                // onStop: that.setTask['NONE'],
                // onStart: that.setTask['TASK_1'],
                // onNext: that.setTask['TASK_2'],
                // onPrevious: that.setTask['TASK_1']
            }
        })

        this.state.start();
    }

    setState(state) {
        switch(state) {
            case 'IDLE':
                this.task = undefined;
                this.uiControl.addText(this.uiControl.TEXT_PANEL, [
                    new ThreeMeshUI.Text({ content: 'No task', fontSize: 0.1 }),
                ]),
                this.uiControl.addButtons(
                    this.uiControl.NAVIGATION_PANEL,
                    [{ name: 'Restart', onClick: () => { this.state.start() } }]
                )
                break;
            case '1': 
                this.task = new PoseMatch({ scene: this.scene, gripper: this.gripper });
                this.task.state.start(); 
                this.startTime = Date.now();
                this.uiControl.addText(
                    this.uiControl.TEXT_PANEL, 
                    [
                        new ThreeMeshUI.Text( {
                            fontSize: 0.075,
                            content: `Introduction to Mimicry Control:`
                        }),
                        new ThreeMeshUI.Text( {
                            fontSize: 0.1,
                            content: `
                            Remote Control`,
                        }),
                        new ThreeMeshUI.Text( {
                            fontSize: 0.05,
                            content: `

                                Squeeze the trigger to activate and deactivate remote control. 
                                
                                Pressing the grip button will make the robot return to its original position.

                                Complete the task by moving the end effector to the indicator.

                            `,
                        })
                    ]
                )
                this.counter = this.uiControl.addTaskCounter(this.uiControl.TEXT_PANEL, this.task);
                this.uiControl.addButtons(
                    this.uiControl.NAVIGATION_PANEL,
                    [
                        {
                            name: 'Next',
                            onClick: () => {
                                this.state.next();
                            }
                        }
                    ]
                )
                break;
            case '2':
                this.task = new PickAndPlace({ scene: this.scene });
                this.task.state.start();
                this.startTime = Date.now();
                this.uiControl.addText(
                    this.uiControl.TEXT_PANEL,
                    [
                        new ThreeMeshUI.Text( {
                            fontSize: 0.075,
                            content: `Introduction to Mimicry Control:`
                        }),
                        new ThreeMeshUI.Text( {
                            fontSize: 0.1,
                            content: `
                            Drag Control`,
                        }),
                        new ThreeMeshUI.Text( {
                            fontSize: 0.05,
                            content: `

                                Move your controller to the robot\'s end effector to activate drag control. Squeeze the trigger while drag control is active to exit drag control.
                                
                                Pressing the grip button will make the robot return to its original position.

                                Complete the task by picking up the block with the robot and placing it inside the red circle.

                            `,
                        })
                    ]
                )
                this.counter = this.uiControl.addTaskCounter(this.uiControl.TEXT_PANEL, this.task);
                this.uiControl.addButtons(
                    this.uiControl.NAVIGATION_PANEL,
                    [
                        {
                            name: 'Next',
                            onClick: () => {
                                this.state.stop();
                            }
                        },
                        {
                            name: 'Previous',
                            onClick: () => {
                                this.state.previous();
                            }
                        }
                    ]
                )
                break;
            default:
                throw new Error(`${state} is not a valid state.`);
        }
    }

    finishRound() {
        this.dataControl.post([[
            this.task.NAME, (Date.now() - this.startTime)
        ]], { type: 'task' })

        this.task.state.next();

        if (!this.task.state.is('IDLE')) {
            this.counter.set({ content: `Task: ${this.task.state.state} / ${this.task.state.NUM_ROUNDS}`,})
            this.startTime = Date.now();
        } else {
            this.state.next();
        }
    }

    // this is called in relaxedikDemo.js about every 5 ms
    update(ee_pose) {
        if (!this.state.is('IDLE')) this.task.update(ee_pose);
    }
}