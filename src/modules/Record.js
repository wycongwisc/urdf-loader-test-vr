import Module from "./Module";
import * as T from 'three';

export class Record extends Module {
    constructor(params, options = {}) {
        super({
            name: 'record'
        });
        Object.assign(this, params);

        const fsmConfig = this.fsmConfig;

        const recordIndicator = new T.Mesh(new T.SphereGeometry( 0.05, 32, 32 ), new T.MeshBasicMaterial({ color: 0xFF0000 }));
        recordIndicator.position.set(0, 1.65, 0);

        const playbackIndicator = new T.Mesh(new T.SphereGeometry(0.05, 32, 32 ), new T.MeshBasicMaterial({ color: 0x0000FF }));
        playbackIndicator.position.set(0, 1.65, 0);

        let playbackInterval, recordInterval; 

        this.isRecording = false;
        this.data = []
        this.frameIndex = 0;

        // state machine additions 

        fsmConfig.transitions.push({ name: 'activatePlayback', from: 'IDLE', to: 'PLAYBACK' });
        fsmConfig.transitions.push({ name: 'deactivatePlayback', from: 'PLAYBACK', to: 'IDLE'});

        fsmConfig.methods['onActivatePlayback'] = () => {
            this.data = JSON.parse(localStorage.getItem('data'));
            window.scene.remove(this.eeOffsetIndicator, window.targetCursor);
            window.scene.add(playbackIndicator);
            playbackInterval = setInterval(() => {
                playbackIndicator.visible = !playbackIndicator.visible;
            }, 500)
        }

        fsmConfig.methods['onDeactivatePlayback'] = () => {
            clearInterval(playbackInterval);
            window.scene.remove(playbackIndicator);
            window.scene.add(this.eeOffsetIndicator, window.targetCursor);
        }

        // ui additions

        this.ui.addButtons(
            this.ui.RECORDING_PANEL,
            [
                {
                    name: 'Record',
                    onClick: () => {
                        if (this.fsm.is('IDLE')) {
                            this.frameIndex = 0;
                            this.isRecording = true;
                            window.scene.add(recordIndicator);
                            recordInterval = setInterval(() => recordIndicator.visible = !recordIndicator.visible, 500)
                        }
                    }
                },
                {
                    name: 'Stop',
                    onClick: () => {
                        if (this.fsm.is('IDLE') && this.isRecording) {
                            this.isRecording = false;
                            window.scene.remove(recordIndicator);
                            clearInterval(recordInterval);
                            localStorage.setItem('data', JSON.stringify(this.data));
                            this.data = [];
                        }
                    }
                },
                {
                    name: 'Play',
                    onClick: () => {
                        if (this.fsm.is('IDLE') && !this.isRecording && localStorage.getItem('data')) {
                            this.fsm.activatePlayback();
                        } else if (this.fsm.is('PLAYBACK')) {
                            this.fsm.deactivatePlayback();
                        }
                    }
                }
            ]
        )

        // REMOVE THIS 
        localStorage.clear();
    }

    update(t, data) {
        if (this.fsm.is('PLAYBACK')) {
            const joints = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            joints.forEach((joint, index) => {
                const jointData = this.data[this.frameIndex].find((e) => e[0] === index);
                if (jointData) window.robot.setJointValue(joint[0],  jointData[1]);
            })   
            if (this.frameIndex < this.data.length - 1) {
                this.frameIndex++;
            } else {
                this.frameIndex = 0;
                this.fsm.deactivatePlayback();
            }
            return true;
        }

        if (this.isRecording) {
            const row = [];
            const joints = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            joints.forEach((joint, index) => {
                let jointIndex = window.robotInfo.joint_ordering.indexOf(joint[0]);
                if (jointIndex != -1) row.push([index, joint[1].jointValue[0]])
            }) 
            this.data.push(row);
            return false;
        }
    }
}