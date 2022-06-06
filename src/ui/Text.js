import ThreeMeshUI from 'three-mesh-ui'
import Element from './Element'

export default class Text extends Element {
    constructor(content, options = {}) {
        super(new ThreeMeshUI.Text({
            content,
            fontSize: options.fontSize ?? 0.05
        }))
    }
}