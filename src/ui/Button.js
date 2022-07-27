import ThreeMeshUI from 'three-mesh-ui'
import * as T from 'three'
import Element from './Element'

export default class Button extends Element {

    constructor(content, options = {}) {
        super(new ThreeMeshUI.Block({
            width: options.width ?? 0.35,
            height: options.height ?? 0.12,
            justifyContent: options.justifyContent ?? 'center',
            alignContent: options.alignContent ?? 'center',
            offset: options.offset ?? 0.05,
            margin: options.margin ?? 0.02,
            borderRadius: options.borderRadius ?? 0.03
        }))

        this.object.add(new ThreeMeshUI.Text({ content }));

        this.object.setupState({
            state: 'selected',
            attributes: {
                offset: 0.02,
                backgroundColor: new T.Color(0x777777),
                fontColor: new T.Color(0x222222)
            },
            onSet: options.onClick
        })

        this.object.setupState({
            state: 'hovered',
            attributes: {
                offset: 0.035,
                backgroundColor: new T.Color(0xFF0000),
                backgroundOpacity: 1,
                fontColor: new T.Color(0xffffff)
            },
        })

        this.object.setupState({
            state: 'idle',
            attributes: {
                offset: 0.035,
                backgroundColor: new T.Color(0xFF0000),
                backgroundOpacity: 0.5,
                fontColor: new T.Color(0xffffff)
            },
        })
    }
}