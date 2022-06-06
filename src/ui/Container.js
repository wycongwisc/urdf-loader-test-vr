import ThreeMeshUI from 'three-mesh-ui'
import Element from './Element'
import { FONT_FAMILY, FONT_TEXTURE } from '../utils';

export default class Container extends Element {
    constructor(name, options = {}) {
        super(new ThreeMeshUI.Block({
            width: options.width ?? 1.2,
            height: options.height ?? 1.1,
            padding: options.padding ?? 0.05,
            justifyContent: options.justifyContent ?? 'center',
            alignContent: options.alignContent ?? 'left',
            fontFamily: options.fontFamily ?? FONT_FAMILY,
            fontTexture: options.fontTexture ?? FONT_TEXTURE
        }));

        this.name = name;
        this.object.name = name;
    }

    appendChild(element) {
        console.log(element);
        this.object.add(element.object);
    }

    show() {
        if (window.scene.getObjectByName(this.name)) return;
        window.scene.add(this.object);
    }

    hide() {
        window.scene.remove(this.object);
    }
}