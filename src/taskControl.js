import PickAndPlace from "./tasks/PickAndPlace"
import PoseMatch from './tasks/PoseMatch'
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import UI from 'three-mesh-ui'

export class TaskControl {
    constructor(params) {
        this.scene = params.scene
        this.camera = params.camera;
        this.gripper = params.gripper

        this.vrControl = params.vrControl;
        this.dataControl = params.dataControl;
        this.targetCursor = params.targetCursor;

        this.setState = this.setState.bind(this);

        const that = this;
        this.ui = params.uiControl;
        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: '1'},
                { name: 'next', from: ['1', '2', '3', '4'], to: function() {
                    return this.state === '4' ? 'IDLE' : `${Number(this.state) + 1}`
                }},
                { name: 'previous', from: ['1', '2', '3', '4'], to: function() {
                    return this.state === '1' ? 'IDLE' : `${Number(this.state) - 1}`
                }},
                { name: 'stop', from: ['1', '2', '3', '4'], to: 'IDLE'},
            ],
            methods: {
                onTransition: function(state) {
                    that.task?.destruct();
                    that.ui.reset();
                    that.vrControl.reset();
                    that.setState(state.to);
                }
            }
        })

        this.state.start();
    }

    setState(state) {
        switch(state) {
            case 'IDLE':
                this.task = undefined;
                this.ui.addText(this.ui.INSTRUCTION_PANEL, [
                    new UI.Text({ fontSize: 0.1, content: 'No task' }),
                ]),
                this.ui.addButtons(
                    this.ui.NAVIGATION_PANEL,
                    [
                        { name: 'Restart', onClick: () => this.state.start() }
                    ]
                )
                break;
            case '1': 
                this.task = new PoseMatch({ 
                    scene: this.scene, 
                    gripper: this.gripper, 
                    disabledControlModes: ['REMOTE_CONTROL'], 
                    taskControl: this, 
                    dataControl: this.dataControl,
                    targetCursor: this.targetCursor
                });
                this.ui.addText(
                    this.ui.INSTRUCTION_PANEL, 
                    [
                        new UI.Text({ fontSize: 0.075, content: `Introduction to Drag Control:` }),
                        new UI.Text({ fontSize: 0.1, content: `\nPose Matching\n` }),
                        new UI.Text({ fontSize: 0.05, content: `\nMove your controller to the robot\'s end effector to activate drag control. Squeeze the trigger while drag control is active to exit drag control.
                            \nPressing the grip button will make the robot return to its original position.
                            \nComplete the task by moving the end effector to the indicator.\n\n`,
                        })
                    ]
                )
                this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
                this.ui.addButtons(
                    this.ui.NAVIGATION_PANEL,
                    [
                        { name: 'Next', onClick: () => this.state.next() },
                    ]
                )
                break;
                
            case '2':
                this.task = new PickAndPlace({ 
                    scene: this.scene, 
                    disabledControlModes: ['REMOTE_CONTROL'], 
                    taskControl: this, 
                    dataControl: this.dataControl,
                    targetCursor: this.targetCursor 
                });
                this.ui.addText(
                    this.ui.INSTRUCTION_PANEL,
                    [
                        new UI.Text({ fontSize: 0.075, content: `Introduction to Drag Control:` }),
                        new UI.Text({ fontSize: 0.1, content: `\nPick and Place\n` }),
                        new UI.Text({ fontSize: 0.05, content: `\nMove your controller to the robot\'s end effector to activate drag control. Squeeze the trigger while drag control is active to exit drag control.
                            \nPressing the grip button will make the robot return to its original position.
                            \nComplete the task by picking up the block with the robot and placing it inside the red circle.\n\n`,
                        })
                    ]
                )
                this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
                this.ui.addButtons(
                    this.ui.NAVIGATION_PANEL,
                    [
                        { name: 'Next', onClick: () => this.state.next() },
                        { name: 'Previous', onClick: () => this.state.previous() }
                    ]
                )
                break;
            case '3': 
                this.task = new PoseMatch({ 
                    scene: this.scene, 
                    gripper: this.gripper, 
                    disabledControlModes: ['DRAG_CONTROL'], 
                    taskControl: this, 
                    dataControl: this.dataControl,
                    targetCursor: this.targetCursor
                });
                this.ui.addText(
                    this.ui.INSTRUCTION_PANEL, 
                    [
                        new UI.Text({ fontSize: 0.075, content: `Introduction to Remote Control:` }),
                        new UI.Text({ fontSize: 0.1, content: `\nPose Matching\n` }),
                        new UI.Text({ fontSize: 0.05, content: `\nSqueeze the trigger to activate and deactivate remote control.             
                            \nPressing the grip button will make the robot return to its original position.
                            \nComplete the task by moving the end effector to the indicator.\n\n`,
                        })
                    ]
                )
                this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
                this.ui.addButtons(
                    this.ui.NAVIGATION_PANEL,
                    [
                        { name: 'Next', onClick: () => this.state.next() },
                        { name: 'Previous', onClick: () => this.state.previous() }
                    ]
                )
                break;
            case '4':
                this.task = new PickAndPlace({
                    scene: this.scene, 
                    disabledControlModes: ['DRAG_CONTROL'], 
                    taskControl: this, 
                    dataControl: this.dataControl,
                    targetCursor: this.targetCursor
                });
                this.ui.addText(
                    this.ui.INSTRUCTION_PANEL,
                    [
                        new UI.Text({ fontSize: 0.075, content: `Introduction to Remote Control:` }),
                        new UI.Text({ fontSize: 0.1, content: `\nPick and Place\n` }),
                        new UI.Text({ fontSize: 0.05, content: `\nSqueeze the trigger to activate and deactivate remote control.             
                            \nPressing the grip button will make the robot return to its original position.
                            \nComplete the task by picking up the block with the robot and placing it inside the red circle.\n\n`,
                        })
                    ]
                )
                this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
                this.ui.addButtons(
                    this.ui.NAVIGATION_PANEL,
                    [
                        { name: 'Next', onClick: () => this.state.next() },
                        { name: 'Previous', onClick: () => this.state.previous() }
                    ]
                )
                break;
            default:
                throw new Error(`${state} is not a valid state.`);
        }
    }

    /**
     * 
     * @param {Object} data information about the round that just completed
     */
    finishRound(data) {
        this.dataControl.post([[
            data.endTime, this.task.id, this.task.name, data.startTime
        ]], 'task')

        // go to the next round
        this.task.state.next();

        // next round exists
        if (!this.task.state.is('IDLE')) {
            this.counter.set({ content: `Task: ${this.task.state.state} / ${this.task.state.NUM_ROUNDS}`,})
        } else {
            this.state.next();
        }
    }

    // this is called in relaxedikDemo.js about every 5 ms
    update(eePose, timestamp) {
        this.task?.update(eePose, timestamp);
    }

    log(timestamp) {
        this.task?.log(timestamp);
    }
}