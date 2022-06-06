import PickAndPlace from "./tasks/PickAndPlace"
import PoseMatch from './tasks/PoseMatch'
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import UI from 'three-mesh-ui'
import Module from "./Module";
import Task from "./tasks/Task"

export class Tasks extends Module {
    constructor(params, tasks, options = {}) {
        super(params);
        Object.assign(this, params);

        this.navigation = options.navigation ?? true;

        this.tasks = tasks;
        this.update = this.update.bind(this);

        if (this.tasks.length === 0) throw new Error('Task module has no tasks');
        this.tasks.forEach((task) => { if (!task instanceof Task) throw new Error(`${task} not an instance of Task`)});

        //

        const that = this;
        const taskIndices = Array.from({ length: this.tasks.length }, (v, k) => `${k + 1}`);

        this.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: taskIndices[0]},
                { name: 'next', from: taskIndices, to: function() {
                    return (Number(this.state) === taskIndices.length) ? 'IDLE' : `${Number(this.state) + 1}`;
                }},
                { name: 'previous', from: taskIndices, to: function() {
                    return (Number(this.state) === taskIndices[0]) ? 'IDLE' : `${Number(this.state) - 1}`;
                }},
                { name: 'stop', from: taskIndices, to: 'IDLE'},
            ],
            methods: {
                onTransition: function(state) {
                    if (state.to === 'IDLE') {
                        that.clearTask();
                    } else {
                        that.setTask(Number(state.to) - 1);
                    }
                }
            }
        })

        this.fsm.start();
    }

    setTask(taskIndex) {
        this.clearTask();

        this.task = this.tasks[taskIndex];
        this.task.fsm.start();
    }

    clearTask() {
        this.task?.clear();
    }

    // setState(state) {
    //     switch(state) {
    //         case 'IDLE':
    //             this.task = undefined;
    //             this.ui.addText(this.ui.INSTRUCTION_PANEL, [
    //                 new UI.Text({ fontSize: 0.1, content: 'No task' }),
    //             ]),
    //             this.ui.addButtons(
    //                 this.ui.NAVIGATION_PANEL,
    //                 [
    //                     { name: 'Restart', onClick: () => this.state.start() }
    //                 ]
    //             )
    //             break;
    //         case '1': 
    //             this.task = new PickAndPlace({ 
    //                 scene: this.scene, 
    //                 disabledControlModes: ['REMOTE_CONTROL'], 
    //                 Tasks: this, 
    //                 data: this.data,
    //                 tasksID: 1, 
    //             });
    //             this.ui.addText(
    //                 this.ui.INSTRUCTION_PANEL,
    //                 [
    //                     new UI.Text({ fontSize: 0.075, content: `Introduction to Drag Control:` }),
    //                     new UI.Text({ fontSize: 0.1, content: `\nPick and Place\n` }),
    //                     new UI.Text({ fontSize: 0.05, content: `\nMove your controller to the robot\'s end effector to activate drag control. Squeeze the trigger while drag control is active to exit drag control.
    //                         \nPressing the grip button will make the robot return to its original position.
    //                         \nComplete the task by picking up the block with the robot and placing it inside the red circle.\n\n`,
    //                     })
    //                 ]
    //             )
    //             this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
    //             this.ui.addButtons(
    //                 this.ui.NAVIGATION_PANEL,
    //                 [
    //                     { name: 'Next', onClick: () => this.state.next() },
    //                     { name: 'Previous', onClick: () => this.state.previous() }
    //                 ]
    //             )
    //             break;
    //         case '2':
    //             this.task = new PickAndPlace({
    //                 scene: this.scene, 
    //                 disabledControlModes: ['DRAG_CONTROL'], 
    //                 Tasks: this, 
    //                 data: this.data,
    //                 tasksID: 2,
    //             });
    //             this.ui.addText(
    //                 this.ui.INSTRUCTION_PANEL,
    //                 [
    //                     new UI.Text({ fontSize: 0.075, content: `Introduction to Remote Control:` }),
    //                     new UI.Text({ fontSize: 0.1, content: `\nPick and Place\n` }),
    //                     new UI.Text({ fontSize: 0.05, content: `\nSqueeze the trigger to activate and deactivate remote control.             
    //                         \nPressing the grip button will make the robot return to its original position.
    //                         \nComplete the task by picking up the block with the robot and placing it inside the red circle.\n\n`,
    //                     })
    //                 ]
    //             )
    //             this.counter = this.ui.addTaskCounter(this.ui.INSTRUCTION_PANEL, this.task);
    //             this.ui.addButtons(
    //                 this.ui.NAVIGATION_PANEL,
    //                 [
    //                     { name: 'Next', onClick: () => this.state.next() },
    //                     { name: 'Previous', onClick: () => this.state.previous() }
    //                 ]
    //             )
    //             break;
    //         default:
    //             throw new Error(`${state} is not a valid state.`);
    //     }
    // }

    update(t) {
        if (this.task?.update(t)) {
            this.fsm.next();
        }
    }

    // log(timestamp) {
    //     this.task?.log(timestamp);
    // }
}