import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import * as T from 'three';

export default class Controllers {
    constructor(renderer, teleportvr) {

        this.controller = [
            { controller: renderer.xr.getController(0), grip: renderer.xr.getControllerGrip(0) },
            { controller: renderer.xr.getController(1), grip: renderer.xr.getControllerGrip(1) }
        ]

        const controllerModelFactory = new XRControllerModelFactory(); 
        this.controller[0].grip.add(controllerModelFactory.createControllerModel(this.controller[0].grip));
        this.controller[1].grip.add(controllerModelFactory.createControllerModel(this.controller[1].grip));

        window.scene.add(this.controller[0].controller);
        window.scene.add(this.controller[0].grip);
        window.scene.add(this.controller[1].controller);
        window.scene.add(this.controller[1].grip);

        this.controller[0].grip.addEventListener('connected', e => {
            this.controller[0].hand = e.data.handedness;
            this.controller[0].gamepad = e.data.gamepad;
            this.controller[0].connected = true;
            teleportvr.add(0, this.controller[0]);
        });

        this.controller[1].grip.addEventListener('connected', e => {
            this.controller[1].hand = e.data.handedness;
            this.controller[1].gamepad = e.data.gamepad;
            this.controller[1].connected = true;
            teleportvr.add(1, this.controller[1]);
        });

        this.hand = 'right';
        this.buttons = {
            'trigger': {},
            'triggerstart': {},
            'triggerend': {},
            'triggerpressed': {},
            'triggerreleased': {},
            'grip': {},
            'gripstart': {},
            'gripend': {},
            'touchpadPress': {},
            'thumbstickPress': {},
            'a': {},
            'b': {},
            'a&b': {}
        };

        this.controller.forEach(controller => {
            controller.controller.addEventListener('select', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['trigger'])) {
                        if (action()) return;
                    }
                }
            })

            controller.controller.addEventListener('selectstart', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['triggerstart'])) {
                        if (action()) return;
                    }
                }
            })

            controller.controller.addEventListener('selectend', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['triggerend'])) {
                        if (action()) return;
                    }
                }
            })

            controller.controller.addEventListener('squeeze', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['grip'])) {
                        if (action()) return;
                    }
                }
            })

            controller.controller.addEventListener('squeezestart', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['gripstart'])) {
                        if (action()) return;
                    }
                }
            })

            controller.controller.addEventListener('squeezeend', () => {
                if (this.get() === controller) {
                    for (const action of Object.values(this.buttons['gripend'])) {
                        if (action()) return;
                    }
                }
            })
        })
    }

    setControl(hand) {
        this.hand = hand;
    }

    addButtonAction(button, name, action) {
        this.buttons[button][name] = action;
        console.log(this.buttons)
    }

    removeButtonAction(button, name) {
        delete this.buttons[button][name];
    }

    get(hand) {
        const i = (this.controller[0].hand === (hand ?? this.hand)) ? 0 : 1;
        return this.controller[i];
    }

    getPose(hand) {
        const i = (this.controller[0].hand === (hand ?? this.hand)) ? 0 : 1;
        return {
            'posi': this.controller[i].grip.getWorldPosition(new T.Vector3()),
            'ori': this.controller[i].grip.getWorldQuaternion(new T.Quaternion())
        }
    }

    getDirection(hand) {
        const i = (this.controller[0].hand === (hand ?? this.hand)) ? 0 : 1;
        return this.controller[i].controller.getWorldDirection(new T.Vector3()).negate();
    }

    update() {
        if (!this.controller[0].connected || !this.controller[1].connected) return;

        if (this.get().gamepad.buttons[0].pressed) {
            for (const action of Object.values(this.buttons['triggerpressed'])) {
                if (action()) return;
            }
        } else {
            for (const action of Object.values(this.buttons['triggerreleased'])) {
                if (action()) return;
            }
        }

        if (this.get().gamepad.buttons[4].pressed) {
            for (const action of Object.values(this.buttons['a'])) {
                if (action()) return;
            }
        }

        if (this.get().gamepad.buttons[5].pressed) {
            for (const action of Object.values(this.buttons['b'])) {
                if (action()) return;
            }
        }

        if (this.get().gamepad.buttons[4].pressed && this.get().gamepad.buttons[5].pressed) {
            for (const action of Object.values(this.buttons['a&b'])) {
                if (action()) return;
            }
        }


    }
}