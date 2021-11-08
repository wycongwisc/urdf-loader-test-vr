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

export function Line3D (points, color, width) {
    let material = new T.MeshBasicMaterial({
        color: color
    })

    let path = new T.CatmullRomCurve3(points, true);
    let radialSegments = 10
    let geometry2 = new T.TubeGeometry(path, points.length, width, radialSegments);

    return new T.Mesh(geometry2, material);
}

export function castShadow(obj) {
    obj.children.forEach(function (child) {
        if (child.constructor.name === 'Mesh') {
            child.castShadow = true;
            child.receiveShadow = true;
        } else if (child.constructor.name === 'Object3D') {
            castShadow(child)
        } else {
            //  console.log('unknown dae format');
        }
    });
}

// https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
export function getBrowser() {
    // Opera 8.0+
    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;

    // Firefox 1.0+
    var isFirefox = typeof InstallTrigger !== 'undefined';

    // Safari 3.0+ "[object HTMLElementConstructor]" 
    var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));

    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/false || !!document.documentMode;

    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;

    // Chrome 1 - 79
    var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);

    // Edge (based on chromium) detection
    var isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);

    // Blink engine detection
    var isBlink = (isChrome || isOpera) && !!window.CSS;


    let output = isFirefox ? "Firefox_" : ''
               + isChrome ? "Chrome_" : ''
               + isSafari ? "Safari_" : ''
               + isOpera ? "Opera_" : ''
               + isIE ? "IE_" : ''
               + isEdge ? "Edge_" : ''
               + isEdgeChromium ? "EdgeChromium_" : '';

    return output;
}

// transformation from ROS' reference frame to THREE's reference frame
export let T_ROS_to_THREE = new T.Matrix4().makeRotationFromEuler(new T.Euler(1.57079632679, 0., 0.));
// transformation from THREE' reference frame to ROS's reference frame
export let T_THREE_to_ROS = T_ROS_to_THREE.clone().invert();