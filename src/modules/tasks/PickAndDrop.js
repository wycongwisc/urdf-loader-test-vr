/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import Task from './Task'
import Block from './objects/Block'
import Table from './objects/Table'
import Box from './objects/Box';
import { computeGripper } from '../../utils';

export default class PickAndDrop extends Task {

    static async init(params, condition,  options = {}) {
        const task = new PickAndDrop(params, condition, options);
        task.objects = {
            'blocks': [
                await Block.init(params),
                await Block.init(params),
                await Block.init(params),
            ],
            'box': await Box.init(params),
            'table': await Table.init(params),
        }
        return task;
    }

    constructor(params, condition, options) {
        super('pick-and-drop', params, condition, options, [
            () => {
                this.objects.blocks[0].set({ position: new T.Vector3(1, 3, 0.2) });
                this.objects.blocks[1].set({ position: new T.Vector3(0.8, 3, 0.5) });
                this.objects.blocks[2].set({ position: new T.Vector3(.7, 3, 0) });
                this.objects.box.set({ position: new T.Vector3(.7, 3, -0.5) });
            },
            () => {
                this.objects.blocks[0].set({ position: new T.Vector3(1, 3, 0.0) });
                this.objects.blocks[1].set({ position: new T.Vector3(0.8, 3, 0.3) });
                this.objects.blocks[2].set({ position: new T.Vector3(.7, 3, -.2) });
                this.objects.box.set({ position: new T.Vector3(.7, 3, .5) });
            }
        ]);
    }

    async onStart() {
        this.instructions = this.ui.createContainer('pick-and-drop-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.52, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Pick and Drop\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText(this.text ?? 'Complete the task by picking up the blocks with the robot and placing them in the box. Close the box after you are done.\n\n'));

        this.blockCounter = this.ui.createContainer('block-counter', {
            height: .1,
            width: .2,
            backgroundOpacity: 0,
        });
        this.blockCounterText = this.ui.createText('- / -', { fontSize: 0.025 });
        this.blockCounter.appendChild(this.blockCounterText);

        this.trialCounterText = this.ui.createText('Trial: - / -');
        this.instructions.appendChild(this.trialCounterText);

        this.instructions.show();
        this.blockCounter.show();
        this.objects.table.set({ 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        });
    }

    onStop() {
        this.instructions.hide();
        this.blockCounter.hide();
    }

    onUpdate(t, info) {
        const blocks = this.objects.blocks;
        const table = this.objects.table;
        const box = this.objects.box;
        const gripper = computeGripper(info.currEEAbsThree);

        for (const block of blocks) block.update(this.world, gripper);

        // table.update(this.world, this.controller);

        // ~ go to the next trial if the box or any block hits the ground ~

        this.world.contactsWith(this.ground, (c) => {
            for (const object of [...blocks, box]) {
                if (object.colliders.includes(c)) {
                    this.fsm.next();
                    return;
                }
            }
        })

        // ~ count how many blocks are in the box ~
        // https://math.stackexchange.com/questions/1472049/check-if-a-point-is-inside-a-rectangular-shaped-area-3d

        const p1 = box.meshes[0].position;
        const p2 = box.meshes[0].localToWorld(new T.Vector3(box.size.x, 0, 0));
        const p3 = box.meshes[0].localToWorld(new T.Vector3(0, box.size.z, 0));
        const p4 = box.meshes[0].localToWorld(new T.Vector3(0, 0, box.size.y));

        const [i, j, k] = [new T.Vector3(), new T.Vector3(), new T.Vector3()]
        i.subVectors(p2, p1);
        j.subVectors(p3, p1);
        k.subVectors(p4, p1);

        let numInside = 0;

        for (const block of blocks) {
            const v = new T.Vector3();
            v.subVectors(block.meshes[0].position, p1);
            if (
                0 < v.dot(i) && v.dot(i) < i.dot(i)
                && 0 < v.dot(j) && v.dot(j) < j.dot(j)
                && 0 < v.dot(k) && v.dot(k) < k.dot(k)
            ) {
                numInside++;
            }
        }

        // ~ check if box is closed if all blocks are in the box ~

        if (numInside === blocks.length) {
            let numContacts = 0;
            const lid = box.colliders[5];
            for (const i of [1, 2, 3, 4]) {
                this.world.contactsWith(box.colliders[i], (collider) => {
                    if (collider === lid) numContacts++;
                })
            }

            // lid must contact all four sides of the box
            if (numContacts === 4) {
                this.fsm.next();
            }
        }

        // ~ update ui elements ~
                
        this.instructions?.getObject().lookAt(this.camera.position);
        this.blockCounter?.getObject().lookAt(this.camera.position);

        // position block counter above the center of the box
        const temp = box.meshes[0].clone();
        temp.translateX(box.size.x / 2);
        temp.translateY(box.size.z / 2);
        temp.translateZ(-.05);

        this.blockCounter?.getObject().position.copy(temp.position);
        
        this.trialCounterText?.set(`Trial: ${Number(this.fsm.state) + 1} / ${this.numRounds}`);
        this.blockCounterText?.set(`${numInside} / ${blocks.length}`);
    }
}