import ThreeMeshUI from 'three-mesh-ui'
import Element from './Element'
import { FONT_FAMILY, FONT_TEXTURE } from '../utils';

export default class Text extends Element {
    constructor(content, options = {}) {
        super(new ThreeMeshUI.Text({
            content,
            fontSize: options.fontSize ?? 0.05,
        }))
    }

    set(text) {
        this.object.set({ content: text });
    }
}