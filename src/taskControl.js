import PickAndPlace from "./tasks/PickAndPlace"
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import ThreeMeshUI from 'three-mesh-ui'

export class TaskControl {
    constructor(params) {
        this.scene = params.scene
        this.camera = params.camera;

        const that = this;
        const uiControl = params.uiControl;

        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'stop', from: ['TASK_1, TASK_2'], to: 'IDLE'},
                { name: 'start', from: 'IDLE', to: 'TASK_1'},
                { name: 'next', from: 'TASK_1', to: 'TASK_2'}
            ],
            methods: {
                onStop: function() { 
                    that.task = undefined;
                    uiControl.setTextPanel([
                        new ThreeMeshUI.Text( {
                            content: 'done',
                            fontSize: 0.1
                        }),
                    ])
                },
                onStart: function() { 
                    that.task = new PickAndPlace({ scene: that.scene });
                    that.task.init() 
                    uiControl.setTextPanel([
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
                },
                onNext: function() {
                    that.task = new PickAndPlace({ scene: that.scene });
                    that.task.init() 
                    uiControl.setTextPanel([
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
                }
            }
        })
        
        this.state.start();
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