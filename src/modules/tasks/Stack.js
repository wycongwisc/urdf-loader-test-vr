import * as T from 'three';
import Target from './objects/Target';
import Task from './Task'
import Table from './objects/Table'
import Block from './objects/Block'
import { v4 as id } from 'uuid';
import { computeGripper } from '../../utils';

export default class Stack extends Task {

    static async init(params, condition, options = {}) {
        const task = new Stack(params, condition, options);
        task.objects = {
            'blocks': [
                await Block.init(params),
                await Block.init(params),
                await Block.init(params),
            ],
            'table': await Table.init(params),
        }
        return task;
    }

    constructor(params, condition, options) {
        super('stack', params, condition, options, [
            () => {
                this.objects.blocks[0].set({ position: new T.Vector3(0.7, 3.0, -0.4) });
                this.objects.blocks[1].set({ position: new T.Vector3(0.8, 3.0, 0) });
                this.objects.blocks[2].set({ position: new T.Vector3(0.6, 3.0, 0.4) });
            },
            () => {
                this.objects.blocks[0].set({ position: new T.Vector3(0.6, 3.0, -0.3) });
                this.objects.blocks[1].set({ position: new T.Vector3(0.8, 3.0, 0.1) });
                this.objects.blocks[2].set({ position: new T.Vector3(0.7, 3.0, 0.3) });
            }
        ]);
    }

    async onStart() {
        this.instructions = this.ui.createContainer('stack-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Block Stacking\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText(this.text ?? 'Complete the task by stacking the blocks in any order.\n\n', { fontSize: 0.04 }));

        this.stackCounter = this.ui.createContainer('stack-counter', {
            height: .1,
            width: .2,
            backgroundOpacity: 0,
        });
        this.stackCounterText = this.ui.createText('- / -', { fontSize: 0.025 });
        this.stackCounter.appendChild(this.stackCounterText);

        this.trialCounterText = this.ui.createText('Trial: - / -');
        this.instructions.appendChild(this.trialCounterText);

        this.instructions.show();
        this.stackCounter.show();
        this.objects.table.set({ 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        });

    }

    onStop() {
        this.instructions.hide();
        this.stackCounter.hide();
    }

    onUpdate(t, info) {
        const blocks = this.objects.blocks;
        const table = this.objects.table;
        const gripper = computeGripper(info.currEEAbsThree);
        
        for (const block of blocks) block.update(this.world, gripper);

        // table.update(this.world, this.controller);

        // ~ go to the next trial if any block hits the ground ~

        this.world.contactsWith(this.ground, (c) => {
            for (const block of blocks) {
                if (c === block.colliders[0]) this.fsm.next();
            }
        })

        // ~ count the number of blocks in the stack ~
        
        blocks.sort((a, b) => b.meshes[0].position.y - a.meshes[0].position.y);
        let stackCount = 1;
        for (let i = 0; i < blocks.length - 1; i++) {
            if (blocks[i].grasped) continue;

            const onGround = false;
            this.world.contactsWith(this.ground, (c) => {
                if (c === blocks[i + 1].colliders[0]) onGround = true;
            })
            if (onGround) continue;

            if (blocks[i].meshes[0].position.y - blocks[i + 1].meshes[0].position.y > .01) {
                stackCount++;
            }
        }

        // ~ go to the next trial if the stack is complete and all blocks are sleeping ~

        let sleepCount = 0;
        if (stackCount === blocks.length) {
            blocks.forEach(block => {
                if (block.rigidBody.isSleeping()) sleepCount++;
            })
            if (sleepCount === blocks.length) this.fsm.next();
        }

        // ~ update ui elements ~

        this.instructions?.getObject().lookAt(window.camera.position);
        this.stackCounter?.getObject().lookAt(window.camera.position);

        this.trialCounterText?.set(`Trial: ${Number(this.fsm.state) + 1} / ${this.numRounds}`);
        this.stackCounterText?.set(`${stackCount} / ${blocks.length}`)

        // only show the stack counter for stacked blocks

        if (stackCount > 1 && !this.fsm.is('COMPLETE')) { // TODO: fix this
            this.stackCounter.show();
            let position;
            for (const block of blocks) {
                if (!block.grasped) {
                    position = block.meshes[0].position.clone().add(new T.Vector3(0, .05, 0))
                    break;
                }
            }
            this.stackCounter.getObject().position.copy(position);   
        } else {
            this.stackCounter.hide();
        }
    }
}