import ThreeMeshUI from 'three-mesh-ui'
import Element from './Element'
import { FONT_FAMILY, FONT_TEXTURE } from '../utils';
import * as T from 'three'

export default class Container extends Element {
    constructor(name, options = {}) {
        super(new ThreeMeshUI.Block({
            width: options.width ?? 1.2,
            height: options.height ?? 1.1,
            padding: options.padding ?? 0.05,
            justifyContent: options.justifyContent ?? 'center',
            alignContent: options.alignContent ?? 'center',
            fontFamily: options.fontFamily ?? FONT_FAMILY,
            fontTexture: options.fontTexture ?? FONT_TEXTURE,
            backgroundOpacity: options.backgroundOpacity ?? 1
        }));

        this.object.position.copy(options.position ?? new T.Vector3(0, 0, 0));
        this.object.rotation.copy(options.rotation ?? new T.Euler(0, 0, 0, 'XYZ'));

        this.name = name;
        this.object.name = name;
    }

    appendChild(element) {
        this.object.add(element.object);
        return this;
    }
    
    show() {
        if (window.scene.getObjectByName(this.name)) return;
        window.scene.add(this.object);
        this.visible = true;
    }

    hide() {
        window.scene.remove(this.object);
        this.visible = false;
    }
}