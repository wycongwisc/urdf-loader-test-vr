import Module from "./Module";
import * as T from 'three'

export default class InteractiveUI extends Module {
    constructor(utilities, options = {}) {
        super('interacive-ui', utilities);

        // ========== options ==========

        // =============================
    }

    load(config) {
        this.raycaster = new T.Raycaster();
        this.ray = new T.ArrowHelper(new T.Vector3(0, 0, 1), new T.Vector3(0, 0, 0), 300, 0xFFFFFF, 1, 1);

        this.controller.addButtonAction('trigger', 'ui-select', () => {
            if (this.fsm.is('IDLE')) {
                if (this.ui.update(this.raycaster, false)) {
                    this.ui.update(this.raycaster, true);
                    return true;
                }
            }
        })
    }

    update(t, info) {
        if (this.fsm.is('PLAYBACK') || this.fsm.is('IDLE')) {
            this.raycaster.set(info.ctrlPose.posi, this.controller.getDirection());
            this.ray.position.copy(this.raycaster.ray.origin);
            this.ray.setDirection(this.raycaster.ray.direction);
            if (this.ray.parent !== window.scene) window.scene.add(this.ray);
            this.ui.update(this.raycaster);
        } else if (this.ray.parent === window.scene) {
            window.scene.remove(this.ray);
        }
    }

    unload() {
        window.scene.remove(this.ray);
    }
}