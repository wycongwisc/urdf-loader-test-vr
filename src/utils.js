import * as T from 'three';
import { create, all } from 'mathjs'

const config = { }
const math = create(all, config);

export function degToRad(degrees) {
    var result = Math.PI / 180 * degrees;
    return result;
}

export function getCurrEEpose() {
    let ee_posi = new T.Vector3();
    window.robot.links.right_hand.getWorldPosition(ee_posi);
    let ee_ori = new T.Quaternion();
    window.robot.links.right_hand.getWorldQuaternion(ee_ori);
    return {"posi": ee_posi, 
            "ori": ee_ori}
}

export function mathjsMatToThreejsVector3(a){
    console.assert( a.size()[0] === 3 , "mathjs matrix is not 3x1");
    let res = new T.Vector3(
        a._data[0],
        a._data[1],
        a._data[2]
    )
    return res;
}

export function threejsVector3ToMathjsMat(a){
    let res = new math.matrix([
        [a.x],
        [a.y],
        [a.z]
    ]);
    return res;
}