import PickAndPlace from "./tasks/PickAndPlace"
import MoveTo from './tasks/MoveTo'
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import ThreeMeshUI from 'three-mesh-ui'

export class TaskControl {
    constructor(params) {
        this.scene = params.scene
        this.camera = params.camera;
        this.gripper = params.gripper

        const that = this;
        this.uiControl = params.uiControl;


        for (const task in this.setTask) {
            this.setTask[task] = this.setTask[task].bind(this);
        }

        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'stop', from: ['TASK_1, TASK_2'], to: 'IDLE'},
                { name: 'start', from: 'IDLE', to: 'TASK_1'},
                { name: 'next', from: 'TASK_1', to: 'TASK_2'},
                { name: 'previous', from: 'TASK_2', to: 'TASK_1'}
            ],
            methods: {
                onStop: that.setTask['NONE'],
                onStart: that.setTask['TASK_1'],
                onNext: that.setTask['TASK_2'],
                onPrevious: that.setTask['TASK_1']
            }
        })
        
        this.state.start();
    }

    setTask = {
        'NONE': function() {
            this.task = undefined;
            this.uiControl.reset();
            this.uiControl.addText([
                new ThreeMeshUI.Text( {
                    content: 'done',
                    fontSize: 0.1
                }),
            ])
        },
        'TASK_1': function() {
            console.log(this)
            this.task = new MoveTo({ scene: this.scene, gripper: this.gripper });
            this.task.init() 
            this.uiControl.display()
            this.uiControl.addText([
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

                        Complete the task by picking up the block with the robot and placing it inside the red circle.

                    `,
                })
            ])
            // this.uiControl.addButtons([{
            //     name: 'Next',
            //     onClick: () => {
            //         this.state.next();
            //     }
            // }])
        }, 
        'TASK_2': function() {
            this.task = new PickAndPlace({ scene: this.scene });
            this.task.init() 
            this.uiControl.reset();
            this.uiControl.addText([
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
            ])
            // this.uiControl.addButtons([{
            //     name: 'Previous',
            //     onClick: () => {
            //         this.state.previous();
            //     }
            // },
            // {
            //     name: 'Next',
            //     onClick: () => {
            //         this.state.stop();
            //     }
            // }])
        }
    }


    finishRound() {
        this.task.clearRound();

        if (this.task.currRound < this.task.rounds.length - 1) {
            this.task.currRound++;
            this.task.displayRound();
        } else {
            if (this.state.is('TASK_1')) {
                this.state.next();
            } else if (this.state.is('TASK_2')) {
                this.state.stop();
            }
        }
    }

    // this is called in relaxedikDemo.js about every 5 ms
    update(ee_pose) {
        if (!this.state.is('IDLE')) this.task.update(ee_pose);
    }
}