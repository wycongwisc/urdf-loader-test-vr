import * as T from 'three';

export function rotQuaternion(q, rot) {
    const axisAngle = quaternionToAxisAngle(q);
    const new_axis = axisAngle.axis.clone().applyMatrix4(rot);
    return new T.Quaternion().setFromAxisAngle(new_axis, axisAngle.angle);        
}

export function changeReferenceFrame(pose, transform) {
    return {
        "posi": pose.posi.clone().applyMatrix4(transform.clone()),
        "ori": rotQuaternion(pose.ori.clone(), transform.clone()) 
    };
}

export function quaternionToAxisAngle(q) {
    // https://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm
    if (q.w > 1) q.normalize();
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);
    const x, y, z;
    if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
        // if s close to zero then direction of axis not important
        x = q.x; // if it is important that axis is normalised then replace with x=1; y=z=0;
        y = q.y;
        z = q.z;
    } else {
        x = q.x / s;  // normalise axis
        y = q.y / s;
        z = q.z / s;
    }
    return {
        axis: new T.Vector3(x, y, z),
        angle: angle
    };
}

export function degToRad(degrees) {
    const result = Math.PI / 180 * degrees;
    return result;
}

export function relToAbs(rel_pose, init_pose) {
    return {
        "posi": init_pose.posi.clone().add(rel_pose.posi),
        "ori": init_pose.ori.clone().premultiply(rel_pose.ori) 
    };
}

export function absToRel(abs_pose, init_pose) {
    return {
        "posi": abs_pose.posi.clone().add( init_pose.posi.clone().negate() ),
        "ori": abs_pose.ori.clone().premultiply(init_pose.ori.clone().invert()) 
    };
}

export function getRandom(min, max) {
    return (Math.random() * (max - min) + min);
}